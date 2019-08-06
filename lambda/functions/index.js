/**
 * S3Vault
 * A Serverless File Vault
 * https://github.com/ashenm/S3Vault
 *
 * Ashen Gunaratne
 * mail@ashenm.ml
 *
 */

const path = require('path');
const async = require('async');
const moment = require('moment');
const filesize = require('filesize');
const highlight = require('highlight.js');
const aws = require('aws-sdk');
const s3 = new aws.S3();

/**
 * @constant
 * @type {array}
 * @description Highlightable language extensions
 */
exports.LANGUAGES = (process.env.LANGUAGES || '').split(':');

/**
 * @constant
 * @type {array}
 * @description S3 storage class
 */
exports.STORAGECLASS = (process.env.STORAGECLASS || 'STANDARD');

/**
 * @constant
 * @type {array}
 * @description Directory listing ignores
 */
exports.EXCLUDES = (process.env.EXCLUDES || '').split(':').concat('index.partial');

// TEMP until moment.js adds support for RFC 2822
// http://momentjs.com/docs/#/parsing/special-formats/
moment.RFC_2822 = 'ddd, DD MMM YYYY HH:mm:ss ZZ';

/**
 * @function index
 * @callback callback
 * @summary Execution entry point
 * @argument {object} event - invoker information
 * @argument {object} context - invocation function information
 * @description Defines the Lambda runtime handler method
 */
exports.index = function (event, context, callback) {

  // avoid self-invoke loop
  if (event.Records[0].s3.object.key.endsWith('.partial')
   || event.Records[0].s3.object.key.endsWith('.highlight')) {
    callback(null);
    return;
  }

  // extract bucket name
  exports.BUCKET = event.Records[0].s3.bucket.name;

  // build indexes filtering duplicates
  async.eachOf(event.Records.reduce(function (accumulator, element) {

    const key = element.s3.object.key.replace(/(.*)\/(.*)|(.*)/, '$1/');

    // highlightable languages
    if (/^ObjectCreated:/.test(element.eventName) && exports.LANGUAGES.includes(path.extname(element.s3.object.key).replace('.', ''))) {
      return Object.defineProperty(accumulator, key, { enumerable: true, writable: true, value: (accumulator[key] || []).concat(element.s3.object.key) });
    }

    // ignore excludes
    if (exports.EXCLUDES.includes(path.basename(element.s3.object.key))) {
      return accumulator;
    }

    // ignore duplicates
    if (accumulator.hasOwnProperty(key)) {
      return accumulator;
    }

    return Object.defineProperty(accumulator, key, { enumerable: true, writable: true, value: accumulator[key] || [] });

  }, {}), function (keys, folder, callback) {

    keys.length
      ? async.each(keys, exports.highlight, function (error) { error ? callback(error) : exports.batch(folder, callback); })
      : exports.batch(folder, callback);

  }, callback);

};

/**
 * @function highlight
 * @callback callback
 * @summary Highlights source code
 * @argument {string} key - object key
 * @description Syntax highlights a source code file specified by a S3 object key
 */
exports.highlight = function (key, callback) {

  async.waterfall([

    function (callback) {
      s3.getObject({ Key: key, Bucket: exports.BUCKET }, callback);
    },

    function (data, callback) {
      try { callback(null, { Body: highlight.highlightAuto(data.Body.toString('utf8')), StorageClass: data.StorageClass }); } catch (error) { callback(error); }
    },

    function (data, callback) {

      const lines = data.Body.value.split(/\r\n|\n/);
      const padding = lines.length.toString().length;

      /* eslint-disable object-property-newline */
      callback(null, { Body: '<pre>' + (lines.map(function (element, index, elements) {
        return '<span>' + (index + 1).toString().padStart(padding, ' ') + '</span>';
      }).join('\n')) + '</pre><pre><code>' + data.Body.value + '</code></pre>', StorageClass: data.StorageClass });
      /* eslint-enable object-property-newline */

    },

    function (data, callback) {
      exports.putObject(key.concat('.highlight'), data, callback);
    }

  ], callback);

};

/**
 * @function build
 * @callback callback
 * @summary Builds index listing
 * @argument {string} folder - S3 folder prefix
 * @argument {string} nextToken - S3 listing continuation token
 * @argument {string} fragments - initial HTML markup
 * @description Builds a directory listing for a specified S3 prefix
 * @todo Revise optional argument to precede callback
 */
exports.build = function (folder, callback, nextToken, fragments) {

  folder = folder.replace(/^\//, '');
  fragments = fragments || [ '<table><thead></thead><tbody>' ];

  async.waterfall([

    function (callback) {

      s3.listObjectsV2({
        Prefix: folder,
        Delimiter: '/',
        EncodingType: 'url',
        ContinuationToken: nextToken,
        Bucket: exports.BUCKET
      }, callback);

    },

    function (data, callback) {

      data.CommonPrefixes.sort(function (a, b) {

        return path.basename(a.Prefix) - path.basename(b.Prefix);

      }).forEach(function (object, index, objects) {

        const prefix = path.basename(object.Prefix);

        if (exports.EXCLUDES.includes(prefix)) {
          return;
        }

        fragments.push('<tr><td colspan="3"><a class="prefix" href="' + prefix + '/">' + prefix + '/</a></td></tr>');

      });

      data.Contents.sort(function (a, b) {

        return path.basename(a.Key) - path.basename(b.Key);

      }).forEach(function (object, index, objects) {

        const key = path.basename(object.Key);
        const mtime = moment(object.LastModified, moment.RFC_2822);

        if (exports.EXCLUDES.includes(key) || object.Key.endsWith('/') || key.match(/\.highlight$/)) {
          return;
        }

        fragments.push(

          /* eslint-disable indent */

          '<tr>',
            '<td>',
              '<a class="key" href="javascript:void(0);">' + key + '</a>',
              '<a class="download" href="' + key + '?download">download</a>',
              (exports.LANGUAGES.includes(path.extname(key).replace('.', '')) ? '<a class="view" href="' + key + '?view">view</a>' : ''),
            '</td>',
            '<td class="size readable" data-size="' + object.Size + '">' + filesize(object.Size) + '</td>',
            '<td class="mtime readable" data-mtime="' + mtime.valueOf() + '">' + mtime.toISOString() + '</td>',
          '</tr>'

          /* eslint-enable indent */

        );

      });

      if (data.IsTruncated) {
        exports.build(folder, callback, data.NextContinuationToken, fragments);
        return;
      }

      fragments.push('</tbody><tfoot></tfoot></table>');
      callback(null, { Body: fragments.join('') });

    },

    function (data, callback) {
      exports.putObject(folder.concat('index.partial'), data, callback);
    }

  ], callback);

};

/**
 * @function batch
 * @callback callback
 * @summary Invokes index builder recursively
 * @argument {string} folder - S3 folder prefix
 * @description Invokes index builder for all folders till root
 */
exports.batch = function (folder, callback) {

  const folders = folder.split('/');

  async.eachOf(folders, function (item, key, callback) {
    exports.build(folders.slice(0, key).join('/').concat('/'), callback);
  }, callback);

};

/**
 * @function putObject
 * @callback callback
 * @summary Uploads a file
 * @argument {string} key - S3 object key
 * @argument {string} data - object content
 * @arguments {string} storageclass - object storage class
 * @description Uploads parameterised data into S3
 */
exports.putObject = function (key, data, callback) {
  s3.putObject({ Body: data.Body, Bucket: exports.BUCKET, Key: key, StorageClass: data.StorageClass || exports.STORAGECLASS }, callback);
};

/* vim: set expandtab shiftwidth=2 syntax=javascript: */

/**
 * Global Scripts
 * vault.ashenm.ml
 *
 * Ashen Gunaratne
 * mail@ashenm.ml
 *
 */

(function () {

  /* global _ */
  /* global AmazonCognitoIdentity */
  /* global AWS */
  /* global moment */
  /* global Prism */

  'use strict';

  // S3 SDK
  var S3;

  // DOM reference
  var DOMNodes = {};

  // highlightable languages
  var LANGUAGES = _.object([
    '.adoc',
    '.asc',
    '.asciidoc',
    '.c',
    '.css',
    '.h',
    '.html',
    '.js',
    '.json',
    'Makefile',
    '.m',
    '.php',
    '.plist',
    '.sql',
    '.txt',
    '.xml'
  ], []);

  // runtime configuration
  var CONFIGURATION = {

    // AWS resource region
    Region: 'us-east-1',

    // Hosted UI
    AppWebDomain: 'auth.ashenm.ml',

    // Cognito specifics
    CongnitoClientID: '3d2vnefdnl2mpq66llp42p2kfn',
    CongnitoUserPoolId: 'us-east-1_lqhwxxJZ6',
    CongnitoTokenScope: [ 'phone', 'email', 'openid' ],
    CongnitoRedirectUriSignIn: window.location.origin,
    CongnitoRedirectUriSignOut: window.location.origin,
    CongnitoAdvancedSecurityDataCollectionFlag: false,
    CognitoIdentityPoolId: 'us-east-1:f944c5ff-3930-409c-b728-f8356347acc1',

    // S3 specifics
    S3Bucket: 'vault.ashenm.ml',
    S3ObjectExcludes: [ '__public__' ]

  };

  // TEMP until moment.js adds support for RFC 2822
  // http://momentjs.com/docs/#/parsing/special-formats/
  moment.RFC_2822 = 'ddd, DD MMM YYYY HH:mm:ss ZZ';

  /**
   * @function ListS3Objects
   * @summary Generates S3 Object Index
   * @param {String} prefix - S3 object prefix
   * @param {String} marker - S3 roll up key
   * @description Generates a customized S3 object index
   */
  var ListS3Objects = function IndexS3ObjectsInBucket (prefix, marker) {

    S3.listObjectsV2({
      Bucket: CONFIGURATION.S3Bucket,
      Delimiter: '/',
      FetchOwner: false,
      Prefix: prefix,
      ContinuationToken: marker,
      EncodingType: 'url'
    }, function (error, data) {

      if (error) {
        RenderError(error.statusCode, error.message);
        return;
      }

      // if URL ends with foo but foo/ exists, redirect to foo/
      if (!window.location.pathname.match(/\/$/)
       && !_.isUndefined(_.findWhere(data.CommonPrefixes, { Prefix: window.location.pathname.replace(/^\//, '') + '/' }))) {
        window.location.href = window.location.href + '/';
        return;
      }

      // if URL still ends with foo and no Contents, reveal 404
      if (!window.location.pathname.match(/\/$/) && _.isEmpty(data.Contents)) {
        RenderError('404', 'Not Found');
        return;
      }

      // handle truncated data
      if (data.IsTruncated) {
        ListS3Objects(data.NextContinuationToken, prefix);
      }

      // render CommonPrefixes
      _.each(data.CommonPrefixes, function (element, index, list) {

        // extract folder name
        var folder = element.Prefix.replace(/\/$/, '').split(/\//).pop();

        // omit excludes
        if (CONFIGURATION.S3ObjectExcludes.indexOf(folder) > -1) {
          return;
        }

        // render entry
        DOMNodes.$index.append(
          _.template('<tr><td colspan="4"><a href="<% print(encodeURIComponent(Prefix)) %>/"><%- Prefix %>/</a></td></tr>')({ Prefix: folder })
        );

      });

      // render Contents
      _.each(data.Contents, function (element, index, list) {

        // ignore Etags
        if (element.Key.match(/\.(md5|sha1|sha256)$/)) {
          return;
        }

        var filename = element.Key.replace(/\/$/, '').split(/\//).pop();

        // omit excludes
        if (CONFIGURATION.S3ObjectExcludes.indexOf(filename) > -1) {
          return;
        }

        var Etag = '<td class="Etag w-25 align-middle text-right d-none d-sm-table-cell">';

        if (_.findWhere(data.Contents, { Key: element.Key + '.md5' })) {
          Etag += '<a class="text-black-50 font-small" href="<% print(encodeURIComponent(Key)) %>.md5">MD5</a>';
        }

        if (_.findWhere(data.Contents, { Key: element.Key + '.sha1' })) {
          Etag += '<a class="text-black-50 font-small" href="<% print(encodeURIComponent(Key)) %>.sha1">SHA1</a>';
        }

        if (_.findWhere(data.Contents, { Key: element.Key + '.sha256' })) {
          Etag += '<a class="text-black-50 font-small" href="<% print(encodeURIComponent(Key)) %>.sha256">SHA256</a>';
        }

        Etag += '</td>';

        DOMNodes.$index.append(_.template(
          '<tr>' +
            '<td class="Key">' +
              '<a href="<% print(encodeURIComponent(Key)) %>"><%- Key %></a> ' +
              '<a class="download text-black-50 font-small d-none d-sm-inline" href="<% print(encodeURIComponent(Key)) %>.download">download</a> ' +
              (LANGUAGES.hasOwnProperty((filename.replace(/.+(?=\.)|.+/, ''))) ? '<a class="view text-black-50 font-small" href="<% print(encodeURIComponent(Key)) %>.src">view</a>' : '') +
            '</td>' +
            '<td class="Size w-25 align-middle text-right text-black-50 font-small readable" onclick="toggleSize(this, event);" data-Size="<%- Size %>">' +
              '<% print(window.bytesToSize(Size)) %>' +
            '</td>' +
            '<td class="LastModified w-25 align-middle text-right text-black-50 font-small d-none d-sm-table-cell readable" onclick="toggleLastModified(this, event);" data-LastModified="<%- LastModified %>">' +
              '<% print(moment(LastModified, moment.RFC_2822).fromNow()) %>' +
            '</td>' +
            Etag +
          '</tr>'
        )({
          'Key': filename,
          'LastModified': moment(element.LastModified, moment.ISO_8601).format(moment.RFC_2822),
          'Size': element.Size
        }));

      });

      return data;

    });

  };

  /**
   * @function GenerateView
   * @summary Generate Vault Index
   * @description Generate corresponding index page contemplating URL path segments
   */
  var GenerateView = function GenerateIndexPage () {

    // initialize S3 SKD
    S3 = new AWS.S3();

    // endmost URI segment
    var tail = window.location.pathname.split('/').pop();

    // *.download
    if (tail.match(/\.download$/)) {

      // generate and redirect to pre-signed URL
      window.location.href = S3.getSignedUrl('getObject', {
        Bucket: CONFIGURATION.S3Bucket,
        Key: window.location.pathname.replace(/^\/|\.download$/g, '')
      });

      return;

    }

    // *.src
    if (tail.match(/\.src$/)) {

      var Key = window.location.pathname.replace(/^\/|\.src$/g, '');

      S3.getObject({
        Bucket: CONFIGURATION.S3Bucket,
        Key: Key,
        ResponseContentType: 'text/html; charset=utf-8'
      }, function (error, data) {

        if (error) {
          RenderError(error.statusCode, error.message);
          return;
        }

        // extract file extension
        var extension = Key.split('.').pop();

        // inject prism.js's CSS
        $('head')
          .prepend('<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/prism/1.15.0/themes/prism-okaidia.min.css" integrity="sha256-+8ReLFz1xaTiP3T0xcJVWrHneeFwCnJUJwvcM0L+Ufw=" crossorigin="anonymous" />')
          .prepend('<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/prism/1.15.0/plugins/line-numbers/prism-line-numbers.min.css" integrity="sha256-Afz2ZJtXw+OuaPX10lZHY7fN1+FuTE/KdCs+j7WZTGc=" crossorigin="anonymous" />');

        // inject source
        $('body').empty().append('<pre class="min-vh-100 rounded-0 m-0"><code class="line-numbers language-' + _.escape(extension) + '">' + _.escape(data.Body) + '</code>');

        // highlight source
        Prism.highlightElement(_.first($('pre code')));

      });

      return;

    }

    // breadcrumbs
    var ancestors = window.location.pathname.split('/').map(decodeURIComponent).slice(1, -1);
    var $breadcrumbs = $('<nav class="navbar justify-content-start breadcrumbs bg-dark font-weight-bold" aria-label="breadcrumb"></nav>');

    // construct root link
    $breadcrumbs.append('<a class="breadcrumbs text-decoration-none text-white" href="/">' + window.location.hostname + '/</a>');

    // construct breadcrumbs
    _.each(ancestors, function (element, index, list) {
      $breadcrumbs.append(_.template('<a class="breadcrumbs text-decoration-none text-white" href="/<%= path %>"><%- ancestor %></a>')({
        ancestor: element + '/',
        path: ancestors.slice(0, index + 1).map(encodeURIComponent).join('/') + '/'
      }));
    });

    // indicate current page
    $breadcrumbs.children(':last-child').attr('aria-current', 'page');

    // render breadcrumbs
    $('header').append($breadcrumbs);

    // generate S3 object index
    ListS3Objects(window.location.pathname.replace(/^\//, ''));

  };

  /**
   * @function RenderError
   * @summary Renders Error
   * @param {Number|String} [statusCode=500] - Error code
   * @param {String} [message=Internal Server Error] - Error message
   * @description Display parameterized error code and message or defaults on viewport
   */
  var RenderError = function renderErrorOnViewport (statusCode, message) {
    $('<tr class="bg-danger text-white"></tr>')
      .html('<th class="border-0" colspan="4">' + (statusCode || '500') + ' ' + (message || 'Internal Server Error') + '</th>')
      .appendTo($('thead').empty());
  };

  /**
   * @function toggleLastModified
   * @summary Convert Object LastModified Representation
   * @param {Element} - DOM element
   * @param {Event} - DOM event
   * @description Toggle object last modified date between human readable and unix
   */
  window.toggleLastModified = function toggleLastModifiedEtag (self, e) {

    var $this = $(self);

    if ($this.hasClass('readable')) {
      $this
        .text(moment($this.attr('data-LastModified'), moment.RFC_2822).valueOf())
        .removeClass('readable')
        .addClass('raw');
    } else {
      $this
        .text(moment($this.attr('data-LastModified'), moment.RFC_2822).fromNow())
        .removeClass('raw')
        .addClass('readable');
    }

    return e;

  };

  /**
   * @function toggleSize
   * @summary Convert Object Size Representation
   * @param {Element} - DOM element
   * @param {Event} - DOM event
   * @description Toggle object size between human readable and bytes
   */
  window.toggleSize = function toggleSizeEtag (self, e) {

    var $this = $(self);

    if ($this.hasClass('readable')) {
      $this
        .text($this.attr('data-Size'))
        .removeClass('readable')
        .addClass('raw');
    } else {
      $this
        .text(window.bytesToSize($this.attr('data-Size')))
        .removeClass('raw')
        .addClass('readable');
    }

    return e;

  };

  /**
   * Convert number of bytes into human readable format.
   * @see http://codeaid.net/javascript/convert-size-in-bytes-to-human-readable-format-(javascript)
   * @param integer bytes Number of bytes to convert
   * @param integer precision Number of digits after the decimal separator
   * @return string
   */
  window.bytesToSize = function bytesToHumanReadable (bytes, precision) {

    if (_.isUndefined(bytes)) {
      return undefined;
    }

    var kilobyte = 1024;
    var megabyte = kilobyte * 1024;
    var gigabyte = megabyte * 1024;
    var terabyte = gigabyte * 1024;

    if ((bytes >= 0) && (bytes < kilobyte)) {
      return bytes + ' B';
    } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
      return (bytes / kilobyte).toFixed(precision) + ' KB';
    } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
      return (bytes / megabyte).toFixed(precision) + ' MB';
    } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
      return (bytes / gigabyte).toFixed(precision) + ' GB';
    } else if (bytes >= terabyte) {
      return (bytes / terabyte).toFixed(precision) + ' TB';
    } else {
      return bytes + ' B';
    }

  };

  // onDOMReady
  // initialize Cognito
  $(function () {

    // associate requisite DOM references
    DOMNodes.$index = $('tbody');

    var unity = sessionStorage.getItem('unity');
    var memento = sessionStorage.getItem('memento');
    var exposition = sessionStorage.getItem('exposition');

    var AuthEngine = new AmazonCognitoIdentity.CognitoAuth({
      ClientId: CONFIGURATION.CongnitoClientID,
      AppWebDomain: CONFIGURATION.AppWebDomain,
      TokenScopesArray: CONFIGURATION.CongnitoTokenScope,
      RedirectUriSignIn: CONFIGURATION.CongnitoRedirectUriSignIn,
      RedirectUriSignOut: CONFIGURATION.CongnitoRedirectUriSignOut,
      IdentityProvider: CONFIGURATION.CongnitoIdentityProvider,
      UserPoolId: CONFIGURATION.CongnitoUserPoolId,
      AdvancedSecurityDataCollectionFlag: CONFIGURATION.CongnitoAdvancedSecurityDataCollectionFlag
    });

    AuthEngine.userhandler = {

      onSuccess: function (e) {

        if (unity && memento && exposition) {

          AWS.config.credentials = new AWS.Credentials({
            accessKeyId: unity,
            secretAccessKey: exposition,
            sessionToken: memento
          });

        } else {

          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: CONFIGURATION.CognitoIdentityPoolId,
            Logins: { [ 'cognito-idp.' + CONFIGURATION.Region + '.amazonaws.com/' + CONFIGURATION.CongnitoUserPoolId ]: e.getIdToken().getJwtToken() }
          }, { region: CONFIGURATION.Region });

        }

        AWS.config.credentials.get(function (error) {

          if (error) {
            RenderError();
            return;
          }

          if (e.state) {
            window.location.href = JSON.parse(decodeURIComponent(e.state)).redirect;
            return;
          }

          GenerateView();
          sessionStorage.setItem('unity', AWS.config.credentials.accessKeyId);
          sessionStorage.setItem('memento', AWS.config.credentials.sessionToken);
          sessionStorage.setItem('exposition', AWS.config.credentials.secretAccessKey);

        });

      },

      onFailure: function (e) {
        RenderError();
      }

    };

    // preserve deeplinks during auth flow
    AuthEngine.setState(encodeURIComponent(JSON.stringify({
      redirect: window.location.href,
      provision: AuthEngine.generateRandomString(AuthEngine.getCognitoConstants().STATELENGTH, AuthEngine.getCognitoConstants().STATEORIGINSTRING)
    })));

    AuthEngine.parseCognitoWebResponse(window.location.href);
    AuthEngine.getSession();

  });

})();
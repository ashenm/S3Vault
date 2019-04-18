/**
 * CookieStorage
 * Pollyfill for Web Storage Store interface
 * https://gist.github.com/ashenm/d34f6697e8e6113edd9f57807e2d9a22
 *
 * Ashen Gunaratne
 * mail@ashenm.ml
 *
 */

(function () {

  window.CookieStorage = function (path, maxAge, samesite) {

    return Object.defineProperties({}, {

      '__path': {
        value: path || '/'
      },

      '__samesite': {
        value: samesite || 'strict'
      },

      '__maxAge': {
        // default one hour
        value: maxAge || 3600
      },

      'getItem': {
        value: function (key) {
          return this.toObject()[key];
        }
      },

      'removeItem': {
        value: function (key) {
          document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT ;path=' + this.__path;
          return this;
        }
      },

      'setItem': {
        value: function (key, value) {
          document.cookie = key + '=' + (value || '') + '; max-age=' + this.__maxAge + '; path' + this.__path;
          return this;
        }
      },

      'toString': {
        value: function (map) {

          var key;
          var flatten = '';

          if (typeof map === 'undefined') {
            return document.cookie;
          }

          for (key in map) {
            flatten += key + '=' + map[key] + '; ';
          }

          return flatten.replace(/;\s$|\s$|;$/, '');

        }
      },

      'toObject': {
        value: function () {

          var i;
          var map;
          var pair;
          var pairs;
          var value;

          if (!document.cookie.length) {
            return {};
          }

          map = {};
          pairs = document.cookie.split(';');

          for (i = 0; i < pairs.length; i++) {
            pair = pairs[i].split('=');
            value = pair[1] || '';
            map[pair[0].trim()] = value.trim();
          }

          return map;

        }
      },

      'clear': {
        value: function () {

          var key;

          for (key in this.toObject()) {
            this.removeItem(key);
          }

          return this;

        }
      }

    });

  };

})();
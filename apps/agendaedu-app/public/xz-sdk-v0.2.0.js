function _typeof(e) {
  return (
    (_typeof =
      'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
        ? function (e) {
            return typeof e;
          }
        : function (e) {
            return e &&
              'function' == typeof Symbol &&
              e.constructor === Symbol &&
              e !== Symbol.prototype
              ? 'symbol'
              : typeof e;
          }),
    _typeof(e)
  );
  /*!
   * @ksxz/jssdk - v0.2.0
   * Copyright(c) 2025 WPS XieZuo
   * Release under the ISC license.
   * Compiled on: Thu, 10 Apr 2025 08:59:40 GMT
   */
}
!(function (e, n) {
  'object' ===
    ('undefined' == typeof exports ? 'undefined' : _typeof(exports)) &&
  'undefined' != typeof module
    ? (module.exports = n())
    : 'function' == typeof define && define.amd
      ? define(n)
      : ((e =
          'undefined' != typeof globalThis ? globalThis : e || self).ksoxz_sdk =
          n());
})(this, function () {
  'use strict';
  var e = (function () {
      function e() {
        ((this._id = 0), (this.listeners = {}));
      }
      return (
        (e.getInstance = function () {
          return null == this.instance
            ? (this.instance = new e())
            : this.instance;
        }),
        Object.defineProperty(e.prototype, 'id', {
          get: function () {
            return ((this._id += 1), this._id);
          },
          enumerable: !1,
          configurable: !0
        }),
        (e.prototype.addListener = function (e, n) {
          var t = n.options,
            o = void 0 === t ? {} : t,
            i = n.onSuccess,
            r = n.onError;
          this.listeners[e] = {
            options: o,
            eventList: [],
            onSuccess: function (e) {
              i && i(e);
            },
            onError: function (e) {
              r && r(e);
            }
          };
        }),
        (e.prototype.removeListener = function (e) {
          delete this.listeners[e];
        }),
        e
      );
    })(),
    n = function () {
      return (
        (n =
          Object.assign ||
          function (e) {
            for (var n, t = 1, o = arguments.length; t < o; t++)
              for (var i in (n = arguments[t]))
                Object.prototype.hasOwnProperty.call(n, i) && (e[i] = n[i]);
            return e;
          }),
        n.apply(this, arguments)
      );
    };
  function t(e, n) {
    var t = {};
    for (var o in e)
      Object.prototype.hasOwnProperty.call(e, o) &&
        n.indexOf(o) < 0 &&
        (t[o] = e[o]);
    if (null != e && 'function' == typeof Object.getOwnPropertySymbols) {
      var i = 0;
      for (o = Object.getOwnPropertySymbols(e); i < o.length; i++)
        n.indexOf(o[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(e, o[i]) &&
          (t[o[i]] = e[o[i]]);
    }
    return t;
  }
  function o(e, n, t) {
    if (t || 2 === arguments.length)
      for (var o, i = 0, r = n.length; i < r; i++)
        (!o && i in n) ||
          (o || (o = Array.prototype.slice.call(n, 0, i)), (o[i] = n[i]));
    return e.concat(o || Array.prototype.slice.call(n));
  }
  var i,
    r,
    a = {
      uploadFile: 'setUploadFileEvent',
      downloadFile: 'setDownloadFileEvent'
    },
    c = 'onProgressUpdate';
  (!(function (e) {
    ((e.PENDING = 'pending'), (e.SUCCESS = 'success'));
  })(i || (i = {})),
    (function (e) {
      e.CREATED = 'created';
    })(r || (r = {})));
  var s = { params: {} },
    u = (function () {
      function t() {
        this.eventListener = e.getInstance();
      }
      return (
        (t.getInstance = function () {
          return null == this.instance
            ? (this.instance = new t())
            : this.instance;
        }),
        (t.prototype.getProgressInstance = function (e, n) {
          var t = this;
          return {
            taskId: n,
            abort: function () {
              var t,
                o = { params: { taskId: n } };
              null === (t = window.ksoxz_sdk) ||
                void 0 === t ||
                t.core.invokeAbortApi(e, o, n);
            },
            onProgressUpdate: function (o) {
              var i = {
                eventName: a[e],
                payload: { params: { taskId: n, isCallback: !0, event: c } },
                taskId: n
              };
              ((t.eventListener.listeners[n].onProgressUpdate = o),
                t.eventListener.listeners[n].eventList.push(i));
            }
          };
        }),
        (t.prototype.getInvokeProgressApiParams = function (e, t, o) {
          void 0 === t && (t = s);
          var i = o || ''.concat(e, '_').concat(this.eventListener.id),
            r = {
              methodName: e,
              callbackName: i,
              params: n(n({}, t.params), { taskId: i })
            },
            a = this.getProgressInstance(e, i);
          return (
            o || this.eventListener.addListener(i, t),
            { invokeParams: r, progressParams: a }
          );
        }),
        (t.prototype.getInvokeApiParams = function (e, n) {
          void 0 === n && (n = s);
          var t = ''.concat(e, '_').concat(this.eventListener.id),
            o = { methodName: e, callbackName: t, params: n.params || {} };
          return (this.eventListener.addListener(t, n), o);
        }),
        (t.prototype.handleCallbackEvent = function (e) {
          var n,
            t = e.callbackName,
            o = e.status,
            a = e.params,
            c = this.eventListener.listeners[t];
          o === i.PENDING && a.event
            ? a.event === r.CREATED
              ? ((c.eventList || []).forEach(function (e) {
                  var n,
                    t = e.eventName,
                    o = e.payload;
                  null === (n = window.ksoxz_sdk) ||
                    void 0 === n ||
                    n.core.invokeApi(t, o);
                }),
                (c.eventList = []))
              : c[a.event] && c[a.event](a)
            : (c &&
                (o === i.SUCCESS ? c.onSuccess(a) : c.onError(a),
                null === (n = c.options) || void 0 === n
                  ? void 0
                  : n.undeleteCallback)) ||
              this.eventListener.removeListener(t);
        }),
        t
      );
    })();
  function p(e) {
    return decodeURIComponent(window.atob(e));
  }
  var d = (function () {
      function e() {
        this.initBridge();
      }
      return (
        (e.getInstance = function () {
          return null == this.instance
            ? (this.instance = new e())
            : this.instance;
        }),
        (e.prototype.initBridge = function () {
          (window.addEventListener('message', function (e) {
            if (
              (function (e) {
                if ('string' == typeof e)
                  try {
                    var n = JSON.parse(e);
                    return !('object' !== _typeof(n) || !n);
                  } catch (e) {
                    return !1;
                  }
                return !1;
              })(e.data)
            ) {
              var n = JSON.parse(e.data);
              'xz_sdk_callback' === n.eventName &&
                u.getInstance().handleCallbackEvent(n.payload);
            }
          }),
            window.WOA_electron &&
              window.WOA_electron.ipcRenderer.on(
                'sdk_callback',
                function (e, n) {
                  u.getInstance().handleCallbackEvent(n);
                }
              ));
        }),
        (e.prototype.sendApi = function (e) {
          window.woa
            ? window.woa.invoke(e)
            : window.WOA_electron &&
              ((e.eventName = e.methodName),
              (e.payload = e.params),
              window.WOA_electron.ipcRenderer.sendToHost(
                'sdk__postMessage',
                JSON.stringify(e)
              ));
        }),
        (e.prototype.invokeProgressApi = function (e, n, t) {
          (void 0 === n && (n = s), void 0 === t && (t = ''));
          var o = u.getInstance().getInvokeProgressApiParams(e, n, t),
            i = o.invokeParams,
            r = o.progressParams;
          return (this.sendApi(i), r);
        }),
        (e.prototype.invokeApi = function (e, n) {
          void 0 === n && (n = s);
          var t = u.getInstance().getInvokeApiParams(e, n);
          this.sendApi(t);
        }),
        e
      );
    })(),
    f = navigator.userAgent,
    l = (f.includes('xiezuo') || f.includes('WOA')) && window.isWOAClient,
    v = f.includes('android-woa'),
    g = f.includes('ios-woa'),
    b = l || v || g,
    h = (function () {
      function e() {
        ((this.version = ''), this.initBridge());
      }
      return (
        (e.getInstance = function () {
          return null == this.instance
            ? (this.instance = new e())
            : this.instance;
        }),
        (e.prototype.initBridge = function () {
          var e;
          v
            ? (window.WOA_Sdk = {
                callback: function (e) {
                  u.getInstance().handleCallbackEvent(JSON.parse(e));
                }
              })
            : g &&
              ((this.version = (e = f.match(/ios-woa\/(\S*)/gm))
                ? e[0].split('/')[1]
                : ''),
              (window.WOA_Sdk = {
                callback: function (e) {
                  u.getInstance().handleCallbackEvent(e);
                }
              }));
        }),
        (e.prototype.sendApi = function (e) {
          if (v) window.woa.invoke(JSON.stringify(e));
          else if (g) {
            var n =
              this.version >= '3.12.0' ? 'WOA_APPSDK_Invoke' : e.methodName;
            window.webkit.messageHandlers[n].postMessage(e);
          }
        }),
        (e.prototype.invokeProgressApi = function (e, n, t) {
          (void 0 === n && (n = s), void 0 === t && (t = ''));
          var o = u.getInstance().getInvokeProgressApiParams(e, n, t),
            i = o.invokeParams,
            r = o.progressParams;
          return (this.sendApi(i), r);
        }),
        (e.prototype.invokeApi = function (e, n) {
          void 0 === n && (n = s);
          var t = u.getInstance().getInvokeApiParams(e, n);
          this.sendApi(t);
        }),
        e
      );
    })(),
    k = new ((function () {
      function n() {
        this.apiList = [];
        var e = l ? d : h;
        ((this.bridge = e.getInstance()),
          b || console.warn('please use in kso xiezuo client environment'));
      }
      return (
        (n.prototype.initSdk = function () {
          var n = this,
            t = 'initSdk',
            o = { methodName: t, callbackName: t };
          (e.getInstance().addListener(t, {
            onSuccess: function (e) {
              n.apiList = e.apis;
            }
          }),
            l && window.woa
              ? window.woa.invoke(o)
              : v
                ? window.woa.initSdk(JSON.stringify(o))
                : g && window.webkit.messageHandlers.initSdk.postMessage(o));
        }),
        (n.prototype.ready = function (e) {
          return e();
        }),
        n
      );
    })())(),
    A = '0.2.0',
    m = {
      invokeAbortApi: function (e, n, t) {
        return k.bridge.invokeProgressApi(''.concat(e, 'Abort'), n, t);
      },
      invokeApi: function (e, n) {
        return k.bridge.invokeApi(e, n);
      }
    },
    y =
      'undefined' != typeof globalThis
        ? globalThis
        : 'undefined' != typeof window
          ? window
          : 'undefined' != typeof global
            ? global
            : 'undefined' != typeof self
              ? self
              : {};
  var w = function (e, n, t) {
    switch (t.length) {
      case 0:
        return e.call(n);
      case 1:
        return e.call(n, t[0]);
      case 2:
        return e.call(n, t[0], t[1]);
      case 3:
        return e.call(n, t[0], t[1], t[2]);
    }
    return e.apply(n, t);
  };
  var C = function (e) {
      return e;
    },
    S = w,
    L = Math.max;
  var I = function (e, n, t) {
    return (
      (n = L(void 0 === n ? e.length - 1 : n, 0)),
      function () {
        for (
          var o = arguments, i = -1, r = L(o.length - n, 0), a = Array(r);
          ++i < r;

        )
          a[i] = o[n + i];
        i = -1;
        for (var c = Array(n + 1); ++i < n; ) c[i] = o[i];
        return ((c[n] = t(a)), S(e, this, c));
      }
    );
  };
  var B = function (e) {
      return function () {
        return e;
      };
    },
    E = 'object' == _typeof(y) && y && y.Object === Object && y,
    O =
      'object' == ('undefined' == typeof self ? 'undefined' : _typeof(self)) &&
      self &&
      self.Object === Object &&
      self,
    P = E || O || Function('return this')(),
    N = P.Symbol,
    j = N,
    _ = Object.prototype,
    D = _.hasOwnProperty,
    W = _.toString,
    F = j ? j.toStringTag : void 0;
  var M = function (e) {
      var n = D.call(e, F),
        t = e[F];
      try {
        e[F] = void 0;
        var o = !0;
      } catch (e) {}
      var i = W.call(e);
      return (o && (n ? (e[F] = t) : delete e[F]), i);
    },
    T = Object.prototype.toString;
  var x = M,
    U = function (e) {
      return T.call(e);
    },
    G = N ? N.toStringTag : void 0;
  var V = function (e) {
    return null == e
      ? void 0 === e
        ? '[object Undefined]'
        : '[object Null]'
      : G && G in Object(e)
        ? x(e)
        : U(e);
  };
  var z = function (e) {
      var n = _typeof(e);
      return null != e && ('object' == n || 'function' == n);
    },
    J = V,
    R = z;
  var Q,
    $ = function (e) {
      if (!R(e)) return !1;
      var n = J(e);
      return (
        '[object Function]' == n ||
        '[object GeneratorFunction]' == n ||
        '[object AsyncFunction]' == n ||
        '[object Proxy]' == n
      );
    },
    H = P['__core-js_shared__'],
    q = (Q = /[^.]+$/.exec((H && H.keys && H.keys.IE_PROTO) || ''))
      ? 'Symbol(src)_1.' + Q
      : '';
  var K = function (e) {
      return !!q && q in e;
    },
    X = Function.prototype.toString;
  var Y = $,
    Z = K,
    ee = z,
    ne = function (e) {
      if (null != e) {
        try {
          return X.call(e);
        } catch (e) {}
        try {
          return e + '';
        } catch (e) {}
      }
      return '';
    },
    te = /^\[object .+?Constructor\]$/,
    oe = Function.prototype,
    ie = Object.prototype,
    re = oe.toString,
    ae = ie.hasOwnProperty,
    ce = RegExp(
      '^' +
        re
          .call(ae)
          .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
          .replace(
            /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
            '$1.*?'
          ) +
        '$'
    );
  var se = function (e) {
      return !(!ee(e) || Z(e)) && (Y(e) ? ce : te).test(ne(e));
    },
    ue = function (e, n) {
      return null == e ? void 0 : e[n];
    };
  var pe = function (e, n) {
      var t = ue(e, n);
      return se(t) ? t : void 0;
    },
    de = (function () {
      try {
        var e = pe(Object, 'defineProperty');
        return (e({}, '', {}), e);
      } catch (e) {}
    })(),
    fe = B,
    le = de,
    ve = le
      ? function (e, n) {
          return le(e, 'toString', {
            configurable: !0,
            enumerable: !1,
            value: fe(n),
            writable: !0
          });
        }
      : C,
    ge = Date.now;
  var be = function (e) {
      var n = 0,
        t = 0;
      return function () {
        var o = ge(),
          i = 16 - (o - t);
        if (((t = o), i > 0)) {
          if (++n >= 800) return arguments[0];
        } else n = 0;
        return e.apply(void 0, arguments);
      };
    },
    he = be(ve),
    ke = C,
    Ae = I,
    me = he;
  var ye = function (e, n) {
    return me(Ae(e, n, ke), e + '');
  };
  var we = function (e) {
    return null != e && 'object' == _typeof(e);
  };
  var Ce = (function (e, n) {
      return function (t) {
        return e(n(t));
      };
    })(Object.getPrototypeOf, Object),
    Se = V,
    Le = Ce,
    Ie = we,
    Be = Function.prototype,
    Ee = Object.prototype,
    Oe = Be.toString,
    Pe = Ee.hasOwnProperty,
    Ne = Oe.call(Object);
  var je = V,
    _e = we,
    De = function (e) {
      if (!Ie(e) || '[object Object]' != Se(e)) return !1;
      var n = Le(e);
      if (null === n) return !0;
      var t = Pe.call(n, 'constructor') && n.constructor;
      return 'function' == typeof t && t instanceof t && Oe.call(t) == Ne;
    };
  var We = w,
    Fe = function (e) {
      if (!_e(e)) return !1;
      var n = je(e);
      return (
        '[object Error]' == n ||
        '[object DOMException]' == n ||
        ('string' == typeof e.message && 'string' == typeof e.name && !De(e))
      );
    },
    Me = ye(function (e, n) {
      try {
        return We(e, void 0, n);
      } catch (e) {
        return Fe(e) ? e : new Error(e);
      }
    }),
    Te = function (n, t) {
      var i = '',
        r = new Set();
      return {
        listen: function (e) {
          var t,
            a = r.size;
          (r.add(e),
            !a &&
              ((t = u.getInstance().getInvokeApiParams(n, {
                options: { undeleteCallback: !0 },
                onSuccess: function () {
                  for (var e = [], n = 0; n < arguments.length; n++)
                    e[n] = arguments[n];
                  return r.forEach(function (n) {
                    return Me.apply(void 0, o([n], e, !1));
                  });
                }
              })),
              (i = t.callbackName),
              k.bridge.sendApi(t)));
        },
        remove: function (n) {
          var o,
            a = r.size;
          (r.delete(n),
            a &&
              !r.size &&
              ((o = u
                .getInstance()
                .getInvokeApiParams(t, { params: { callbackName: i } })),
              e.getInstance().removeListener(i),
              k.bridge.sendApi(o),
              (i = '')));
        }
      };
    },
    xe = Te('onGetWifiList', 'offGetWifiList'),
    Ue = Te('onLocationChange', 'offLocationChange'),
    Ge = { params: { count: 9 } },
    Ve = Object.freeze({
      __proto__: null,
      version: A,
      chooseContact: function (e) {
        return k.bridge.invokeApi('chooseContact', e);
      },
      createGroupChat: function (e) {
        return k.bridge.invokeApi('createGroupChat', e);
      },
      chooseGroupMember: function (e) {
        return k.bridge.invokeApi('chooseGroupMember', e);
      },
      shareMessage: function (e) {
        var o = e.params,
          i = void 0 === o ? {} : o,
          r = i.channelObject,
          a = t(i, ['channelObject']);
        return k.bridge.invokeApi(
          'shareMessage',
          n(n({}, e), {
            params: n(n({}, a), {
              channelObject: r ? JSON.stringify(r) : void 0
            })
          })
        );
      },
      getUserInfo: function (e) {
        return k.bridge.invokeApi('getUserInfo', e);
      },
      enterProfile: function (e) {
        return k.bridge.invokeApi('enterProfile', e);
      },
      chooseChat: function (e) {
        return k.bridge.invokeApi('chooseChat', e);
      },
      requestAccess: function (e) {
        return k.bridge.invokeApi('requestAccess', e);
      },
      getGatewayCache: function (e) {
        return k.bridge.invokeApi('getGatewayCache', e);
      },
      launchNativeApp: function (e) {
        return k.bridge.invokeApi('launchNativeApp', e);
      },
      makePhoneCall: function (e) {
        return k.bridge.invokeApi('makePhoneCall', e);
      },
      openSchema: function (e) {
        return k.bridge.invokeApi('openSchema', e);
      },
      openSetting: function (e) {
        return k.bridge.invokeApi('openSetting', e);
      },
      getSetting: function (e) {
        return k.bridge.invokeApi('getSetting', e);
      },
      canIUse: function (e) {
        return k.apiList.includes(e);
      },
      config: function (e) {
        var n = e.onSuccess;
        return (
          e.params && (e.params.version = A),
          (e.onSuccess = function () {
            (k.initSdk(), n && n());
          }),
          k.bridge.invokeApi('config', e)
        );
      },
      ready: function (e) {
        return k.ready(e);
      },
      core: m,
      setClipboard: function (e) {
        return k.bridge.invokeApi('setClipboard', e);
      },
      scan: function (e) {
        var n = e.onSuccess;
        return (
          (e.onSuccess = function (t) {
            if (t.text)
              try {
                t.text = encodeURIComponent(t.text);
              } catch (n) {
                (console.error('error: ', n), e.onError && e.onError(n));
              }
            n && n(t);
          }),
          k.bridge.invokeApi('scan', e)
        );
      },
      accelerometerWatchShake: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          k.bridge.invokeApi('accelerometerWatchShake', e)
        );
      },
      accelerometerClearShake: function () {
        return (
          e.getInstance().removeListener('accelerometerWatchShake'),
          k.bridge.invokeApi('accelerometerClearShake')
        );
      },
      setNetworkListener: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('setNetworkListener', e)
        );
      },
      removeNetworkListener: function () {
        return (
          e.getInstance().removeListener('setNetworkListener'),
          k.bridge.invokeApi('removeNetworkListener')
        );
      },
      setScreenShotListener: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('setScreenShotListener', e)
        );
      },
      removeScreenShotListener: function () {
        return (
          e.getInstance().removeListener('setScreenShotListener'),
          k.bridge.invokeApi('removeScreenShotListener')
        );
      },
      setDisplayModeListener: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('setDisplayModeListener', e)
        );
      },
      removeDisplayModeListener: function (n) {
        return (
          e.getInstance().removeListener('setDisplayModeListener'),
          k.bridge.invokeApi('removeDisplayModeListener', n)
        );
      },
      getWifiStatus: function (e) {
        return k.bridge.invokeApi('getWifiStatus', e);
      },
      getConnectedWifi: function (e) {
        return k.bridge.invokeApi('getConnectedWifi', e);
      },
      getWifiList: function (e) {
        return k.bridge.invokeApi('getWifiList', e);
      },
      onGetWifiList: function (e) {
        return xe.listen(e);
      },
      offGetWifiList: function (e) {
        return xe.remove(e);
      },
      keyboard: function (e) {
        return k.bridge.invokeApi('keyboard', e);
      },
      getClipboard: function (e) {
        return k.bridge.invokeApi('getClipboard', e);
      },
      getNetworkQualityType: function (e) {
        return k.bridge.invokeApi('getNetworkQualityType', e);
      },
      setNetworkQualityChange: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('setNetworkQualityChange', e)
        );
      },
      removeNetworkQualityChange: function () {
        return (
          e.getInstance().removeListener('setNetworkQualityChange'),
          k.bridge.invokeApi('removeNetworkQualityChange')
        );
      },
      getNetworkType: function (e) {
        return k.bridge.invokeApi('getNetworkType', e);
      },
      chooseFile: function (e) {
        return k.bridge.invokeApi('chooseFile', e);
      },
      previewFile: function (e) {
        return k.bridge.invokeApi('previewFile', e);
      },
      uploadFile: function (e) {
        var n = e.onSuccess,
          t = e.onError;
        return (
          (e.onSuccess = function (e) {
            if (n)
              try {
                n(p(e.response), p(e.header));
              } catch (e) {
                t && t(e);
              }
          }),
          (e.onError = function (e) {
            if (t)
              try {
                (e.response && (e.response = p(e.response)), t(e));
              } catch (e) {
                t(e);
              }
          }),
          k.bridge.invokeProgressApi('uploadFile', e)
        );
      },
      downloadFile: function (e) {
        return k.bridge.invokeProgressApi('downloadFile', e);
      },
      getLocationInfo: function (e) {
        return k.bridge.invokeApi('getLocationInfo', e);
      },
      startLocationUpdate: function (e) {
        return k.bridge.invokeApi('startLocationUpdate', e);
      },
      stopLocationUpdate: function (e) {
        return k.bridge.invokeApi('stopLocationUpdate', e);
      },
      onLocationChange: function (e) {
        return Ue.listen(e);
      },
      offLocationChange: function (e) {
        return Ue.remove(e);
      },
      openLocation: function (e) {
        return k.bridge.invokeApi('openLocation', e);
      },
      reverseGeocode: function (e) {
        return k.bridge.invokeApi('reverseGeocode', e);
      },
      chooseImage: function (e) {
        void 0 === e && (e = Ge);
        var o = e.params,
          i = void 0 === o ? {} : o,
          r = i.watermarkConfig,
          a = t(i, ['watermarkConfig']);
        return k.bridge.invokeApi(
          'chooseImage',
          n(n({}, e), {
            params: n(n({}, a), {
              watermarkConfig: r ? JSON.stringify(r) : void 0
            })
          })
        );
      },
      previewImage: function (e) {
        return k.bridge.invokeApi('previewImage', e);
      },
      getImageBase64: function (e) {
        return k.bridge.invokeApi('getImageBase64', e);
      },
      saveImageToAlbum: function (e) {
        return k.bridge.invokeApi('saveImageToAlbum', e);
      },
      previewImageById: function (e) {
        return k.bridge.invokeApi('previewImageById', e);
      },
      compressImage: function (e) {
        return k.bridge.invokeApi('compressImage', e);
      },
      getImageInfo: function (e) {
        return k.bridge.invokeApi('getImageInfo', e);
      },
      getVideoInfo: function (e) {
        return k.bridge.invokeApi('getVideoInfo', e);
      },
      chooseMedia: function (e) {
        return k.bridge.invokeApi('chooseMedia', e);
      },
      setNavigationButton: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          k.bridge.invokeApi('setNavigationButton', e)
        );
      },
      closeNavBar: function () {
        return k.bridge.invokeApi('closeNavBar');
      },
      setSidebarButton: function (e) {
        return k.bridge.invokeApi('setSidebarButton', e);
      },
      hideMenuItems: function (e) {
        return k.bridge.invokeApi('hideMenuItems', e);
      },
      showMenuItems: function (e) {
        return k.bridge.invokeApi('showMenuItems', e);
      },
      setNavigationBarColor: function (e) {
        return k.bridge.invokeApi('setNavigationBarColor', e);
      },
      configureMenu: function (e) {
        return k.bridge.invokeApi(
          'configureMenu',
          n(n({}, e), { options: { undeleteCallback: !0 } })
        );
      },
      setNavBarTitle: function (e) {
        return k.bridge.invokeApi('setNavBarTitle', e);
      },
      getDeviceInfo: function (e) {
        return k.bridge.invokeApi('getDeviceInfo', e);
      },
      getAppInfo: function (e) {
        return k.bridge.invokeApi('getAppInfo', e);
      },
      authorize: function (e) {
        return k.bridge.invokeApi('authorize', e);
      },
      getWebAppInfo: function (e) {
        return k.bridge.invokeApi('getWebAppInfo', e);
      },
      setAppInfoListener: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('setAppInfoListener', e)
        );
      },
      removeAppInfoListener: function () {
        return (
          e.getInstance().removeListener('setAppInfoListener'),
          k.bridge.invokeApi('removeAppInfoListener')
        );
      },
      writeLog: function (e) {
        return k.bridge.invokeApi('writeLog', e);
      },
      invokeCustomAPI: function (e) {
        return k.bridge.invokeApi('invokeCustomAPI', e);
      },
      showAlert: function (e) {
        return k.bridge.invokeApi('showAlert', e);
      },
      showConfirm: function (e) {
        return k.bridge.invokeApi('showConfirm', e);
      },
      showPrompt: function (e) {
        return k.bridge.invokeApi('showPrompt', e);
      },
      showToast: function (e) {
        return k.bridge.invokeApi('showToast', e);
      },
      showPreloader: function (e) {
        return k.bridge.invokeApi('showPreloader', e);
      },
      hidePreloader: function (e) {
        return k.bridge.invokeApi('hidePreloader', e);
      },
      showActionSheet: function (e) {
        return k.bridge.invokeApi('showActionSheet', e);
      },
      openUrl: function (e) {
        return k.bridge.invokeApi('openUrl', e);
      },
      closeApp: function () {
        return k.bridge.invokeApi('closeApp');
      },
      closeWeb: function () {
        return k.bridge.invokeApi('closeWeb');
      },
      rotateScreenView: function (e) {
        return k.bridge.invokeApi('rotateScreenView', e);
      },
      closeSidebar: function () {
        return k.bridge.invokeApi('closeSidebar');
      },
      goHome: function () {
        return k.bridge.invokeApi('goHome');
      },
      getStepCount: function (e) {
        return k.bridge.invokeApi('getStepCount', e);
      },
      selectClusterEnv: function (e) {
        return k.bridge.invokeApi('selectClusterEnv', e);
      },
      openBluetoothAdapter: function (e) {
        return k.bridge.invokeApi('openBluetoothAdapter', e);
      },
      closeBluetoothAdapter: function (e) {
        return k.bridge.invokeApi('closeBluetoothAdapter', e);
      },
      getBluetoothAdapterState: function (e) {
        return k.bridge.invokeApi('getBluetoothAdapterState', e);
      },
      startBluetoothDevicesDiscovery: function (e) {
        return k.bridge.invokeApi('startBluetoothDevicesDiscovery', e);
      },
      stopBluetoothDevicesDiscovery: function (e) {
        return k.bridge.invokeApi('stopBluetoothDevicesDiscovery', e);
      },
      getConnectedBluetoothDevices: function (e) {
        return k.bridge.invokeApi('getConnectedBluetoothDevices', e);
      },
      getBluetoothDevices: function (e) {
        return k.bridge.invokeApi('getBluetoothDevices', e);
      },
      onBluetoothDeviceFound: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('onBluetoothDeviceFound', e)
        );
      },
      offBluetoothDeviceFound: function (n) {
        return (
          e.getInstance().removeListener('onBluetoothDeviceFound'),
          k.bridge.invokeApi('offBluetoothDeviceFound', n)
        );
      },
      onBluetoothAdapterStateChange: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('onBluetoothAdapterStateChange', e)
        );
      },
      offBluetoothAdapterStateChange: function (n) {
        return (
          e.getInstance().removeListener('onBluetoothAdapterStateChange'),
          k.bridge.invokeApi('offBluetoothAdapterStateChange', n)
        );
      },
      getBLEDeviceServices: function (e) {
        return k.bridge.invokeApi('getBLEDeviceServices', e);
      },
      setBLEMTU: function (e) {
        return k.bridge.invokeApi('setBLEMTU', e);
      },
      readBLECharacteristicValue: function (e) {
        return k.bridge.invokeApi('readBLECharacteristicValue', e);
      },
      writeBLECharacteristicValue: function (e) {
        return k.bridge.invokeApi('writeBLECharacteristicValue', e);
      },
      getBLEDeviceCharacteristics: function (e) {
        return k.bridge.invokeApi('getBLEDeviceCharacteristics', e);
      },
      connectBLEDevice: function (e) {
        return k.bridge.invokeApi('connectBLEDevice', e);
      },
      disconnectBLEDevice: function (e) {
        return k.bridge.invokeApi('disconnectBLEDevice', e);
      },
      onBLEConnectionStateChange: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('onBLEConnectionStateChange', e)
        );
      },
      offBLEConnectionStateChange: function (n) {
        return (
          e.getInstance().removeListener('onBLEConnectionStateChange'),
          k.bridge.invokeApi('offBLEConnectionStateChange', n)
        );
      },
      onBLECharacteristicValueChange: function (e) {
        return (
          (e.options = { undeleteCallback: !0 }),
          (e.onSuccess = e.onChange),
          k.bridge.invokeApi('onBLECharacteristicValueChange', e)
        );
      },
      offBLECharacteristicValueChange: function (n) {
        return (
          e.getInstance().removeListener('onBLECharacteristicValueChange'),
          k.bridge.invokeApi('offBLECharacteristicValueChange', n)
        );
      },
      notifyBLECharacteristicValueChange: function (e) {
        return k.bridge.invokeApi('notifyBLECharacteristicValueChange', e);
      }
    });
  return (
    b && ((window.ksoxz_sdk = Ve), console.log('ksoxz jssdk version:', A)),
    Ve
  );
});

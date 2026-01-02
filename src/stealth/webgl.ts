// WebGL fingerprint spoofing
export function getWebGLPatch(vendor: string, renderer: string): string {
  return `
    (function() {
      const spoofedVendor = '${vendor}';
      const spoofedRenderer = '${renderer}';

      // Override WebGLRenderingContext
      const getParameterProxyHandler = {
        apply: function(target, thisArg, args) {
          const param = args[0];

          // UNMASKED_VENDOR_WEBGL
          if (param === 37445) {
            return spoofedVendor;
          }

          // UNMASKED_RENDERER_WEBGL
          if (param === 37446) {
            return spoofedRenderer;
          }

          // VENDOR
          if (param === 7936) {
            return 'WebKit';
          }

          // RENDERER
          if (param === 7937) {
            return 'WebKit WebGL';
          }

          return Reflect.apply(target, thisArg, args);
        }
      };

      // Patch WebGLRenderingContext
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);

      // Patch WebGL2RenderingContext if available
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
      }

      // Override getExtension to return debug extension with spoofed info
      const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
      WebGLRenderingContext.prototype.getExtension = function(name) {
        const ext = originalGetExtension.call(this, name);

        if (name === 'WEBGL_debug_renderer_info' && ext) {
          return {
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446
          };
        }

        return ext;
      };

      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;
        WebGL2RenderingContext.prototype.getExtension = function(name) {
          const ext = originalGetExtension2.call(this, name);

          if (name === 'WEBGL_debug_renderer_info' && ext) {
            return {
              UNMASKED_VENDOR_WEBGL: 37445,
              UNMASKED_RENDERER_WEBGL: 37446
            };
          }

          return ext;
        };
      }

      // Slightly modify shader precision
      const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
      WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        const result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
        if (result) {
          return {
            rangeMin: result.rangeMin,
            rangeMax: result.rangeMax,
            precision: result.precision
          };
        }
        return result;
      };
    })();
  `;
}

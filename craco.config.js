require('dotenv').config({ path: '.env.local' })
console.log('PROXY', process.env.PROXY)
// jshint esversion:6
module.exports = {
    devServer: process.env.PROXY
        ? {
              proxy: {
                  '/api': { target: process.env.PROXY, changeOrigin: true },
              },
          }
        : undefined,
}

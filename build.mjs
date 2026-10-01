// 打包脚本:把 src/ 下的 ES 模块与 three.js 打成一个经典脚本 dist/app.js
// 这样 index.html 双击即可打开(file:// 也能运行),无需本地服务器。
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  outfile: 'dist/app.js',
  logLevel: 'info',
  legalComments: 'none',
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('watching src/ ...');
} else {
  await esbuild.build(opts);
}

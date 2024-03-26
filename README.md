# 🍥 Colstonjs

`Colstonjs` is an open-source, `non-opinionated` web framework built on Bunjs for the modern web. It is fast, simple and scalable.

```ts
import Colston, { Context } from '@colstonjs/core';

const app: Colston = new Colston();
app.get('/', function(ctx: Context) {
  return ctx.status(200).text('Hello Colstonjs');
});

app.listen(8000, function() { console.log(':listening'); });
```

See the [docs](https://colstonjs.pages.dev) page for a complete guide on how to start building fast, reliable and scalable web apps. Or view the source [here](https://github.com/bristol-svr)
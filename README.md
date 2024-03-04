# 🍥 @colstonjs/core

```ts
import Colston, { Context } from '@colstonjs/core';

const app: Colston = new Colston();
app.get('/', function(ctx: Context) {
  return ctx.status(200).text('Hello Colstonjs');
});

app.listen(8000, function() { console.log(':listening'); });
```
import Context from './context'

export default class WebSocketContext {
  ctx: Context;
  constructor(context: Context) {
    this.ctx = context;
  }

  getContext(strip?: boolean): Context {
    // strip off all the instance methods if specified
    return strip ? JSON.parse(JSON.stringify(this.ctx)) : this.ctx;
  }
}

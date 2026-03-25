class Stream {
  listeners=[];
  subscribe(fn){this.listeners.push(fn);}
  emit(d){this.listeners.forEach(f=>f(d));}
}

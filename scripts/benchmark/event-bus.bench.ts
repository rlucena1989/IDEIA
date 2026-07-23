import { Bench } from 'tinybench';
import { EventEmitter } from 'events';

export function eventBusBench(bench: Bench) {
  const bus = new EventEmitter();
  let counter = 0;
  bus.on('test', () => { counter++; });

  bench
    .add('emit 1 event', () => {
      counter = 0;
      bus.emit('test');
    })
    .add('emit 1000 events', () => {
      counter = 0;
      for (let i = 0; i < 1000; i++) bus.emit('test');
    })
    .add('emit with 10 listeners', () => {
      const localBus = new EventEmitter();
      for (let i = 0; i < 10; i++) localBus.on('msg', () => {});
      localBus.emit('msg');
    });
}

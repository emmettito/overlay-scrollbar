import { JSX, useState } from 'react';
import { useOverlayScrollbar } from './useOverlayScrollbar';

export function App(): JSX.Element {
  const [count, setCount] = useState(30);
  const [keepShowing, setKeepShowing] = useState(false);
  const listRef = useOverlayScrollbar<HTMLDivElement>({ autoHide: !keepShowing });

  return (
    <div className="demo">
      <div className="controls">
        <button type="button" onClick={() => setCount(count + 10)}>
          Add 10 items
        </button>
        <button type="button" onClick={() => setCount(Math.max(0, count - 10))}>
          Remove 10 items
        </button>
        <label>
          <input type="checkbox" checked={keepShowing} onChange={e => setKeepShowing(e.target.checked)} /> Keep the bars
          showing
        </label>
        <span className="count">{count} items</span>
      </div>
      <div className="list" ref={listRef}>
        <div className="row">This first row is wide enough to scroll sideways as well, so both bars show</div>
        {Array.from({ length: count }, (_, i) => (
          <div className="row" key={i}>
            Item {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

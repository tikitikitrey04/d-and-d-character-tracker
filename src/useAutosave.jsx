import { useEffect, useRef, useState } from "react";
import { createAutosave } from "../shared/autosave.mjs";

export default function useAutosave(character, save, onSaved, paused) {
  const callbacks = useRef({ save, onSaved });
  callbacks.current = { save, onSaved };
  const engine = useRef(null);
  const [status, setStatus] = useState({ phase: "saved", error: "" });
  useEffect(() => {
    const saver = createAutosave({
      initial: character,
      save: (snapshot) => callbacks.current.save(snapshot),
      onSaved: (result, snapshot) =>
        callbacks.current.onSaved(result, snapshot),
      onStatus: setStatus,
    });
    engine.current = saver;
    return () => {
      saver.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current.setPaused(paused);
    engine.current.update(character);
  }, [character, paused]);
  return { ...status, flush: () => engine.current?.flush() };
}

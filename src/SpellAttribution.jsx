import React from "react";

export default function SpellAttribution() {
  return (
    <p className="spell-attribution">
      This work includes material from the System Reference Document 5.2 (“SRD
      5.2”) by Wizards of the Coast LLC, available at{" "}
      <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer">
        https://www.dndbeyond.com/srd
      </a>
      . The SRD 5.2 is licensed under the Creative Commons Attribution 4.0
      International License, available at{" "}
      <a
        href="https://creativecommons.org/licenses/by/4.0/legalcode"
        target="_blank"
        rel="noreferrer"
      >
        https://creativecommons.org/licenses/by/4.0/legalcode
      </a>
      . Spell data provided through{" "}
      <a href="https://open5e.com" target="_blank" rel="noreferrer">
        Open5e
      </a>
      ; fields formatted for this app. Greater Invisibility’s missing source
      description was restored from SRD 5.2, page 137.
    </p>
  );
}

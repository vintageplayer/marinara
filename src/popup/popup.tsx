import React, { useEffect, useState } from "react";
import "../assets/tailwind.css";

const Popup = () => {
  const [count, setCount] = useState(0);
  const [currentURL, setCurrentURL] = useState<string>();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
  }, []);

  return (
    <>
      <ul style={{ minWidth: "700px" }}>
        <li>Current URL: {currentURL}</li>
        <li>Current Time: {new Date().toLocaleTimeString()}</li>
      </ul>
    </>
  );
};

export default Popup;
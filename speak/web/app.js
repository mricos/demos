"use strict";

const $ = (sel) => document.querySelector(sel);

const audio = $("#audio");
const textEl = $("#text");
const clockEl = $("#clock");
const btnPlay = $("#btnPlay");
const btnPause = $("#btnPause");
const btnStop = $("#btnStop");
const rate = $("#rate");

let manifest = null;
let activeIdx = -1;
let spans = [];

function setActive(i) {
  if (i === activeIdx) return;
  if (activeIdx >= 0 && spans[activeIdx]) spans[activeIdx].classList.remove("active");
  activeIdx = i;
  if (activeIdx >= 0 && spans[activeIdx]) {
    spans[activeIdx].classList.add("active");
    spans[activeIdx].scrollIntoView({ block: "nearest" });
  }
}

function findChunkIndexByTime(t) {
  const ch = manifest.chunks;
  for (let i = 0; i < ch.length; i++) {
    if (t >= ch[i].start_s && t < ch[i].end_s) return i;
  }
  if (ch.length && t >= ch[ch.length - 1].start_s) return ch.length - 1;
  return -1;
}

async function load() {
  manifest = await (await fetch("../out/manifest.json", { cache: "no-store" })).json();
  audio.src = "../out/" + manifest.audio;

  const frag = document.createDocumentFragment();
  spans = manifest.chunks.map((c, i) => {
    const s = document.createElement("span");
    s.className = "chunk";
    s.dataset.i = String(i);
    s.textContent = c.t + " ";
    s.addEventListener("click", () => {
      audio.currentTime = c.start_s;
      audio.play();
    });
    frag.appendChild(s);
    return s;
  });
  textEl.replaceChildren(frag);

  audio.playbackRate = Number(rate.value);
}

btnPlay.addEventListener("click", () => audio.play());
btnPause.addEventListener("click", () => audio.pause());
btnStop.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  setActive(-1);
});

rate.addEventListener("input", () => {
  audio.playbackRate = Number(rate.value);
});

audio.addEventListener("timeupdate", () => {
  const t = audio.currentTime;
  clockEl.textContent = t.toFixed(3);
  if (!manifest) return;
  setActive(findChunkIndexByTime(t));
});

audio.addEventListener("ended", () => setActive(-1));

load().catch((e) => {
  console.error(e);
  textEl.textContent = "Failed to load manifest/audio. See console.";
});


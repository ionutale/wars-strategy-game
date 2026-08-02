import "./vite-env.d.ts";

const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d")!;
ctx.fillStyle = "#3f7a3c";
ctx.fillRect(0, 0, canvas.width, canvas.height);

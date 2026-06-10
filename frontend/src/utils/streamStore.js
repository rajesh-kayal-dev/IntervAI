let stream = null;
let cleanup = null;

export function setStream(s) {
  if (stream && stream !== s) {
    stream.getTracks().forEach(t => t.stop());
  }
  stream = s;
}

export function getStream() {
  return stream;
}

export function clearStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  stream = null;
}

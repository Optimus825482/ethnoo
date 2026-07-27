// sessionStorage limits persistence, not XSS exposure; CSP remains the execution boundary.
const key = (requestId: string | number) => `guest-capability:${requestId}`;

export const guestCapabilityStorage = {
  get: (requestId: string | number) => sessionStorage.getItem(key(requestId)),
  set: (requestId: string | number, capability: string) => sessionStorage.setItem(key(requestId), capability),
  remove: (requestId: string | number) => sessionStorage.removeItem(key(requestId)),
};

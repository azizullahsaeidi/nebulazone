/**
 * Generates a unique alphanumeric identifier of length 10.
 *
 * @returns {string} A unique alphanumeric identifier.
 */
const getUniqueId = (): string => Math.random().toString(36).substring(2, 12);

/**
 * Creates a web worker using the provided function.
 * The worker is returned as an object with three methods: `transfer`, `post`, and `terminate`.
 *
 * @param {Function} fn - The function to be used as the web worker.
 * @returns {Object} An object with methods `transfer`, `post`, and `terminate` representing the web worker.
 */
export function createWorker(fn: Function) {
  const workerBlob = new Blob(["(", fn.toString(), ")()"], {
    type: "application/javascript",
  });
  const workerURL = URL.createObjectURL(workerBlob);
  const worker = new Worker(workerURL);

  return {
    /**
     * Method to transfer data to the worker with a callback function.
     *
     * @param {*} message - The data to be transferred.
     * @param {Function} cb - The callback function to be called when the worker responds.
     */
    transfer: (message: any, cb: Function) => {},
    /**
     * Method to post data to the worker with a callback function and optional transfer list.
     *
     * @param {*} message - The data to be sent to the worker.
     * @param {Function} cb - The callback function to be called when the worker responds.
     * @param {Transferable[]} [transferList] - An optional array of transferable objects to be transferred to the worker.
     */
    post: (message: any, cb: Function, transferList?: Transferable[]) => {
      const id = getUniqueId();

      worker.onmessage = (e) => {
        if (e.data.id === id) {
          cb(e.data.message);
        }
      };

      worker.postMessage(
        {
          id,
          message,
        },
        transferList
      );
    },
    /**
     * Method to terminate the web worker and release the associated resources.
     */
    terminate: () => {
      worker.terminate();
      URL.revokeObjectURL(workerURL);
    },
  };
}

/**
 * A Web Worker that processes image files to create an ImageBitmap.
 */
export function BitmapWorker(): void {
  self.onmessage = (
    e: MessageEvent<{ id: string; message: { file: File } }>
  ) => {
    // Process the image file to create an ImageBitmap
    createImageBitmap(e.data.message.file).then((bitmap) => {
      // Post the created ImageBitmap back to the main thread with an ID
      // @ts-ignore
      self.postMessage({ id: e.data.id, message: bitmap }, [bitmap]);
    });
  };
}

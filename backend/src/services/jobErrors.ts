export class JobCanceledError extends Error {
  constructor() {
    super('Job canceled')
  }
}

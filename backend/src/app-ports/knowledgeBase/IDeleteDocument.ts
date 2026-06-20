export interface IDeleteDocument {
  execute(id: string): Promise<void>;
}

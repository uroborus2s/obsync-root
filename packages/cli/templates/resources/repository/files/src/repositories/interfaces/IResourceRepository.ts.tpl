export interface I{{pascalName}}Record {
  id: string;
  name: string;
  createdAt: string;
}

export interface I{{pascalName}}Repository {
  findAll(): Promise<I{{pascalName}}Record[]>;
}

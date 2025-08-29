import request from "supertest";
import app from "../../helpers/testApp";

async function registerAndLogin(username = "user1", password = "123456") {
  await request(app).post("/users").send({ username, password });
  const loginRes = await request(app)
    .post("/users/login")
    .send({ username, password });
  const token: string = loginRes.body?.data?.token;
  return { token };
}

describe("Contact Controller (CRUD + validações)", () => {
  //cria contato válido com sucesso
  it("cria contato válido com sucesso", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rodrigo Arantes", phone: "12988664422" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contact).toBeDefined();
    expect(res.body.data.contact.name).toBe("Rodrigo Arantes");
  });

  //impede criação sem campo obrigatório (name)
  it("impede criação sem campo obrigatório (name)", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "12988664422" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //impede criação com name muito curto
  it("impede criação com name muito curto", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "A", phone: "12988664422" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //impede criação com telefone inválido
  it("impede criação com telefone inválido", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fulano", phone: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //lista somente contatos do usuário autenticado
  it("lista somente contatos do usuário autenticado", async () => {
    const u1 = await registerAndLogin("user1", "123456");
    const u2 = await registerAndLogin("user2", "123456");

    // cria 2 contatos para u1 (user1)
    await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${u1.token}`)
      .send({ name: "C1", phone: "12988664400" });
    await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${u1.token}`)
      .send({ name: "C2", phone: "12988664401" });

    // cria 1 contato para u2 (user2)
    await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${u2.token}`)
      .send({ name: "C3", phone: "12988664402" });

    // lista u1 → deve ver 2
    const listU1 = await request(app)
      .get("/contacts")
      .set("Authorization", `Bearer ${u1.token}`);
    expect(listU1.status).toBe(200);
    expect(Array.isArray(listU1.body.data)).toBe(true);
    expect(listU1.body.data.length).toBe(2);
    expect(listU1.body.data.map((c: any) => c.name).sort()).toEqual([
      "C1",
      "C2",
    ]);

    // lista u2 → deve ver 1
    const listU2 = await request(app)
      .get("/contacts")
      .set("Authorization", `Bearer ${u2.token}`);
    expect(listU2.status).toBe(200);
    expect(listU2.body.data.length).toBe(1);
    expect(listU2.body.data[0].name).toBe("C3");
  });

  //atualiza contato existente com sucesso
  it("atualiza contato existente com sucesso", async () => {
    const { token } = await registerAndLogin();
    const create = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Old", phone: "12988664422" });
    const id = create.body.data.contact.id;

    const upd = await request(app)
      .put(`/contacts/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New", phone: "12988664400" });

    expect(upd.status).toBe(200);
    expect(upd.body.success).toBe(true);
    expect(upd.body.data.name || upd.body.data.contact?.name).toBeDefined(); // compat
  });

  //retorna 404 ao tentar atualizar contato inexistente
  it("retorna 404 ao tentar atualizar contato inexistente", async () => {
    const { token } = await registerAndLogin();
    const upd = await request(app)
      .put("/contacts/9999")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nome Valido", phone: "12988664400" });

    expect(upd.status).toBe(404);
    expect(upd.body.success).toBe(false);
  });

  //deleta contato existente com sucesso
  it("deleta contato existente com sucesso", async () => {
    const { token } = await registerAndLogin();
    const create = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Del", phone: "12988664422" });
    const id = create.body.data.contact.id;

    const del = await request(app)
      .delete(`/contacts/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    const list = await request(app)
      .get("/contacts")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data.length).toBe(0);
  });

  //retorna 404 ao tentar deletar contato inexistente
  it("retorna 404 ao tentar deletar contato inexistente", async () => {
    const { token } = await registerAndLogin();
    const del = await request(app)
      .delete("/contacts/9999")
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(404);
    expect(del.body.success).toBe(false);
  });

  //rejeita acesso sem token (middleware de auth)
  it("rejeita acesso sem token (middleware de auth)", async () => {
    const res = await request(app).get("/contacts");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

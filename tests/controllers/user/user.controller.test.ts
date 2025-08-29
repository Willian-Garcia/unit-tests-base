import request from "supertest";
import app from "../../helpers/testApp";
import crypto from "crypto";

describe("User Controller", () => {
  const userData = { username: "testeuser", password: "123456" };

  //deve criar usuário com sucesso
  it("deve criar usuário com sucesso", async () => {
    const res = await request(app).post("/users").send(userData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("Usuário criado com sucesso.");

    const check = await global.pool.query(
      "SELECT * FROM users WHERE username=$1",
      [userData.username]
    );
    expect(check.rows.length).toBe(1);
  });

  //não deve permitir criar usuário duplicado
  it("não deve permitir criar usuário duplicado", async () => {
    await request(app).post("/users").send(userData);
    const res = await request(app).post("/users").send(userData);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //deve realizar login e retornar token
  it("deve realizar login e retornar token", async () => {
    await request(app).post("/users").send(userData);

    const res = await request(app).post("/users/login").send(userData);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  //deve realizar logout e invalidar token
  it("deve realizar logout e invalidar token", async () => {
    await request(app).post("/users").send(userData);

    const loginRes = await request(app).post("/users/login").send(userData);
    const token = loginRes.body.data.token;

    const res = await request(app)
      .post("/users/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const blacklisted = await global.redis.get(`blacklist:jwt:${tokenHash}`);
    expect(blacklisted).toBe("true");
  });

  //não deve permitir criar usuário com username curto
  it("não deve permitir criar usuário com username curto", async () => {
    const res = await request(app)
      .post("/users")
      .send({ username: "ab", password: "123456" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  //deve rejeitar login com senha incorreta
  it("deve rejeitar login com senha incorreta", async () => {
    await request(app)
      .post("/users")
      .send({ username: "usuarioX", password: "123456" });
    const res = await request(app)
      .post("/users/login")
      .send({ username: "usuarioX", password: "errada" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

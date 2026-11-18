import { init, $, $$, db, user, busy, attempt } from "./common.js";
attempt(async () => {
  await init();
  if (user) {
    location.href = "index.html";
    return;
  }
  let mode = "login";
  const form = $("#auth-form");
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        mode = b.dataset.mode;
        $$("[data-mode]").forEach((x) =>
          x.classList.toggle("selected", x === b),
        );
        $("#nickname-label").hidden = mode === "login";
        form.elements.nickname.required = mode === "signup";
        $("#password-rule").hidden = mode === "login";
        form.elements.password.autocomplete =
          mode === "login" ? "current-password" : "new-password";
        $("#auth-submit").textContent =
          mode === "login" ? "로그인" : "회원가입";
        $("#auth-error").textContent = "";
      }),
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim(),
      password = form.elements.password.value,
      nickname = form.elements.nickname.value.trim();
    $("#auth-error").textContent = "";
    if (
      mode === "signup" &&
      (password.length < 10 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password))
    ) {
      $("#auth-error").textContent =
        "비밀번호는 영문 대문자와 숫자를 포함한 10자 이상이어야 합니다.";
      return;
    }
    await busy(form, async () => {
      const r =
        mode === "login"
          ? await db.auth.signInWithPassword({ email, password })
          : await db.auth.signUp({
              email,
              password,
              options: { data: { nickname } },
            });
      if (r.error) {
        $("#auth-error").textContent = /invalid login/i.test(r.error.message)
          ? "이메일 또는 비밀번호가 틀렸습니다."
          : r.error.message;
        return;
      }
      if (r.data.session) location.href = "index.html";
      else
        $("#auth-error").textContent =
          "가입되었습니다. 이메일 인증이 필요한 경우 받은 메일을 확인하세요.";
    });
  };
});

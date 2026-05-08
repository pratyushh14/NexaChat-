import { useEffect, useRef, useState } from "react";
import "./login.css";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabase";
import upload from "../../lib/upload";
import { useUserStore } from "../../lib/userStore";

const MSGS = [
  { text: "hey, you online? 👋", side: "left" },
  { text: "just sent you the files ✓✓", side: "right" },
  { text: "haha yes 😂", side: "left" },
  { text: "meeting at 3pm?", side: "right" },
  { text: "this is encrypted 🔐", side: "left" },
  { text: "on my way!", side: "right" },
  { text: "sounds good 👍", side: "left" },
  { text: "miss you! 💜", side: "right" },
  { text: "done! sending now 🚀", side: "right" },
  { text: "omg no way!! 😱", side: "left" },
  { text: "see you soon ✨", side: "right" },
];

const ORBS = [
  { x: 0.15, y: 0.3,  r: 0.38, c: [124,58,237],  s: 0.00018, p: 0 },
  { x: 0.8,  y: 0.7,  r: 0.32, c: [79,70,229],   s: 0.00022, p: 1.5 },
  { x: 0.5,  y: 0.15, r: 0.25, c: [167,139,250], s: 0.00015, p: 3 },
  { x: 0.85, y: 0.2,  r: 0.22, c: [99,102,241],  s: 0.00025, p: 4.5 },
  { x: 0.2,  y: 0.8,  r: 0.28, c: [196,181,253], s: 0.0002,  p: 2 },
];

const Login = () => {
  const canvasRef = useRef(null);
  const bubblesRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const starsRef = useRef(null);

  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [loading, setLoading] = useState(false);
  const { fetchUserInfo } = useUserStore();

  /* ── Aurora Canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      mouseRef.current = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
    });

    const draw = (ts) => {
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#07071A";
      ctx.fillRect(0, 0, W, H);

      ORBS.forEach((o, i) => {
        const wx = Math.sin(ts * o.s + o.p) * 0.06;
        const wy = Math.cos(ts * o.s * 0.7 + o.p) * 0.05;
        const mx = (mouseRef.current.x - 0.5) * 0.04 * (i % 2 === 0 ? 1 : -1);
        const my = (mouseRef.current.y - 0.5) * 0.04 * (i % 2 === 0 ? 1 : -1);
        const cx = (o.x + wx + mx) * W, cy = (o.y + wy + my) * H;
        const rad = o.r * Math.max(W, H);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0,   `rgba(${o.c},0.22)`);
        g.addColorStop(0.4, `rgba(${o.c},0.09)`);
        g.addColorStop(1,   `rgba(${o.c},0)`);
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });

      if (!starsRef.current) {
        starsRef.current = Array.from({ length: 120 }, () => ({
          x: Math.random(), y: Math.random(),
          s: Math.random() * 1.2 + 0.3,
          o: Math.random() * 0.4 + 0.1,
          sp: Math.random() * 0.001 + 0.0005,
          ph: Math.random() * Math.PI * 2,
        }));
      }
      starsRef.current.forEach(st => {
        const op = st.o * (0.5 + 0.5 * Math.sin(ts * st.sp + st.ph));
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,195,255,${op})`; ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  /* ── Floating Bubbles ── */
  useEffect(() => {
    const layer = bubblesRef.current;
    if (!layer) return;
    let cancelled = false;
    const ts = [];

    const spawn = (negativeDelay = 0) => {
      if (cancelled) return;
      const msg = MSGS[Math.floor(Math.random() * MSGS.length)];
      const el = document.createElement("div");
      el.className = `floatBubble ${msg.side}`;
      el.textContent = msg.text;
      const dur = 9000 + Math.random() * 7000;
      // Negative delay = animation already in-progress when bubble mounts
      // This makes bubbles appear mid-flight instantly instead of starting off-screen
      const delay = negativeDelay !== 0
        ? -Math.abs(negativeDelay)   // negative = CSS starts animation mid-way
        : Math.random() * 800;       // subsequent bubbles: small positive delay
      el.style.cssText = `left:${60 + Math.random() * (innerWidth - 280)}px;bottom:-60px;animation-duration:${dur}ms;animation-delay:${delay}ms;font-size:${11 + Math.random() * 3}px;`;
      layer.appendChild(el);
      const t = setTimeout(() => el.remove(), dur + Math.max(0, delay) + 500);
      ts.push(t);
    };

    // Spawn 16 bubbles immediately with negative delays scattered between -2s and -9s
    // Each bubble appears at a different height (mid-flight) from the first frame
    for (let i = 0; i < 16; i++) {
      const negDelay = 2000 + Math.random() * 7000; // 2s–9s into animation already
      ts.push(setTimeout(() => spawn(negDelay), i * 60)); // 60ms apart just for DOM spread
    }

    // Keep spawning new bubbles from the bottom continuously
    const sched = () => { if (cancelled) return; spawn(0); ts.push(setTimeout(sched, 900 + Math.random() * 1200)); };
    ts.push(setTimeout(sched, 100));

    return () => { cancelled = true; ts.forEach(clearTimeout); layer.innerHTML = ""; };
  }, []);

  const handleAvatar = (e) => {
    if (e.target.files[0]) setAvatar({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email"), password = fd.get("password");
    if (!email || !password) { toast.warn("Fill all fields"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchUserInfo(data.user.id);
      toast.success("Welcome back!");
    } catch (err) { toast.error(err.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get("username")?.trim(), email = fd.get("email"), password = fd.get("password");
    if (!username || !email || !password) { toast.warn("Fill all fields"); return; }
    if (password.length < 6) { toast.warn("Password ≥ 6 characters"); return; }
    setLoading(true);
    try {
      const { data: ex } = await supabase.from("users").select("id").eq("username", username).maybeSingle();
      if (ex) { toast.error("Username taken"); return; }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      let avatarUrl = "";
      if (avatar.file) { try { avatarUrl = await upload(avatar.file); } catch {} }

      await supabase.from("users").upsert({ id: data.user.id, username, email, avatar: avatarUrl, blocked: [] });
      await supabase.from("user_chats").upsert({ user_id: data.user.id, chats: [] });

      toast.success("Account created! Sign in now.");
      e.target.reset();
      setAvatar({ file: null, url: "" });
    } catch (err) { toast.error(err.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="loginPage">
      <canvas ref={canvasRef} className="bgCanvas" />
      <div className="grain" />
      <div className="bubbleLayer" ref={bubblesRef} />

      <div className="logo">Nexa<span>Chat</span></div>

      <div className="cardsWrap">
        {/* Sign In */}
        <form className="card cardSignin" onSubmit={handleLogin}>
          <h2>Welcome back,</h2>
          <p className="sub">Sign in to your encrypted space</p>
          <div className="featurePills">
            <div className="pill"><span className="pillDot" /> E2E Encrypted</div>
            <div className="pill"><span className="pillDot" /> Zero-log</div>
            <div className="pill"><span className="pillDot" /> Private</div>
          </div>
          <div className="inpWrap"><input type="email" name="email" placeholder="Email address" autoComplete="off" /></div>
          <div className="inpWrap"><input type="password" name="password" placeholder="Password" /></div>
          <button className="btnPrimary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
          <div className="divider">or</div>
          <div className="statusRow">
            <div className="statusDot" /><div className="statusDot" /><div className="statusDot" />
          </div>
          <p className="footerNote"><a href="#">Forgot password?</a> &nbsp;·&nbsp; <a href="#">Privacy Policy</a></p>
        </form>

        {/* Sign Up */}
        <form className="card cardSignup" onSubmit={handleRegister}>
          <h2>Create Account</h2>
          <p className="sub">Join the conversation</p>
          <label className="avatarUpload" htmlFor="regAvatar">
            <div className="avatarCircle" style={avatar.url ? { backgroundImage: `url(${avatar.url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
              {!avatar.url && "A"}
            </div>
            <span>{avatar.file ? avatar.file.name.substring(0, 22) + "…" : "Upload a profile photo"}</span>
          </label>
          <input type="file" id="regAvatar" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
          <div className="inpWrap"><input type="text" name="username" placeholder="Username" autoComplete="off" /></div>
          <div className="inpWrap"><input type="email" name="email" placeholder="Email address" autoComplete="off" /></div>
          <div className="inpWrap"><input type="password" name="password" placeholder="Password" /></div>
          <button className="btnPrimary" type="submit" disabled={loading}>{loading ? "Creating…" : "Sign Up Free"}</button>
          <p className="footerNote" style={{ marginTop: 12 }}>By signing up you agree to our <a href="#">Terms</a></p>
        </form>
      </div>
    </div>
  );
};

export default Login;
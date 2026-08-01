'use client';

import { useState, useRef, useCallback } from 'react';

interface Scene {
  id: number;
  imageUrl: string | null;
  caption: string;
  manualDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioDuration: number;
  kbDirection: 1 | -1;
  imagePrompt: string;
  imageProvider: 'pollinations' | 'gemini';
  isGeneratingImage: boolean;
  isGeneratingVoice: boolean;
  avatarScript: string;
  avatarVideoUrl: string | null;
  isGeneratingAvatar: boolean;
}

let sceneIdSeq = 1;

function fmtTime(s: number) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  kbProgress: number,
  direction: number
) {
  const cw = canvas.width, ch = canvas.height;
  const scale = 1 + 0.12 * kbProgress;
  const iw = img.width, ih = img.height;
  const canvasRatio = cw / ch, imgRatio = iw / ih;
  let drawW: number, drawH: number;
  if (imgRatio > canvasRatio) { drawH = ch * scale; drawW = drawH * imgRatio; }
  else { drawW = cw * scale; drawH = drawW / imgRatio; }
  const offsetX = (cw - drawW) / 2 + direction * 20 * kbProgress;
  const offsetY = (ch - drawH) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function drawCaption(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string, opacity: number) {
  if (!text) return;
  const cw = canvas.width, ch = canvas.height;
  ctx.save();
  ctx.globalAlpha = opacity;
  const maxWidth = cw - 120;
  ctx.font = "600 34px 'Space Grotesk', sans-serif";
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w + ' '; }
    else line = test;
  });
  lines.push(line);
  const lineHeight = 46;
  const boxHeight = lines.length * lineHeight + 40;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, ch - boxHeight - 30, cw, boxHeight + 30);
  ctx.fillStyle = '#f3ede1';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => {
    ctx.fillText(l.trim(), cw / 2, ch - boxHeight + 20 + i * lineHeight);
  });
  ctx.restore();
}

export default function VideoStudioPage() {
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: sceneIdSeq++, imageUrl: null, caption: '', manualDuration: 4,
      audioBlob: null, audioUrl: null, audioDuration: 0, kbDirection: 1,
      imagePrompt: '', imageProvider: 'pollinations', isGeneratingImage: false,
      isGeneratingVoice: false,
      avatarScript: '', avatarVideoUrl: null, isGeneratingAvatar: false,
    },
  ]);
  const [isRendering, setIsRendering] = useState(false);
  const [status, setStatus] = useState('Tambahkan scene untuk mulai.');
  const [statusErr, setStatusErr] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [recordingSceneId, setRecordingSceneId] = useState<number | null>(null);
  const [timecode, setTimecode] = useState('00:00 / 00:00');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const totalDuration = scenes.reduce((acc, s) => acc + (s.audioBlob ? s.audioDuration : s.manualDuration), 0);

  const addScene = () => {
    setScenes((prev) => [...prev, {
      id: sceneIdSeq++, imageUrl: null, caption: '', manualDuration: 4,
      audioBlob: null, audioUrl: null, audioDuration: 0,
      kbDirection: Math.random() > 0.5 ? 1 : -1,
      imagePrompt: '', imageProvider: 'pollinations', isGeneratingImage: false,
      isGeneratingVoice: false,
      avatarScript: '', avatarVideoUrl: null, isGeneratingAvatar: false,
    }]);
  };

  const removeScene = (id: number) => setScenes((prev) => prev.filter((s) => s.id !== id));

  const updateScene = (id: number, patch: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleImageUpload = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => updateScene(id, { imageUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const generateSceneImage = async (id: number) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;
    const prompt = scene.imagePrompt.trim() || scene.caption.trim();
    if (!prompt) {
      setStatus('Isi prompt gambar (atau caption) dulu sebelum generate AI.');
      setStatusErr(true);
      return;
    }
    updateScene(id, { isGeneratingImage: true });
    setStatusErr(false);
    setStatus('Menghasilkan gambar AI untuk scene ini...');
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: scene.imageProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal generate gambar AI.');
      updateScene(id, { imageUrl: data.imageUrl });
      setStatus('Gambar AI berhasil dibuat untuk scene ini.');
    } catch (err: any) {
      setStatus('Gagal generate gambar AI: ' + err.message);
      setStatusErr(true);
    } finally {
      updateScene(id, { isGeneratingImage: false });
    }
  };

  const speakCaption = (text: string) => {
    if (!text.trim()) { setStatus('Isi captionnya dulu ya.'); setStatusErr(true); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'id-ID';
    window.speechSynthesis.speak(utter);
  };

  const generateSceneVoice = async (id: number) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;
    const text = scene.caption.trim();
    if (!text) {
      setStatus('Isi caption dulu sebelum generate suara AI.');
      setStatusErr(true);
      return;
    }
    updateScene(id, { isGeneratingVoice: true });
    setStatusErr(false);
    setStatus('Menghasilkan suara AI (wanita)...');
    try {
      const res = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: 'id' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal generate suara AI.');

      const audioRes = await fetch(data.audioUrl);
      const blob = await audioRes.blob();
      const url = URL.createObjectURL(blob);
      const tempAudio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        tempAudio.onloadedmetadata = () => {
          updateScene(id, { audioBlob: blob, audioUrl: url, audioDuration: tempAudio.duration });
          resolve();
        };
        tempAudio.onerror = () => reject(new Error('Audio hasil AI gagal dimuat.'));
      });
      setStatus('Suara AI berhasil dibuat untuk scene ini.');
    } catch (err: any) {
      setStatus('Gagal generate suara AI: ' + err.message);
      setStatusErr(true);
    } finally {
      updateScene(id, { isGeneratingVoice: false });
    }
  };

  // Generate video avatar (talking-head) dari gambar scene + naskah, pakai D-ID.
  const generateSceneAvatar = async (id: number) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;

    if (!scene.imageUrl) {
      setStatus('Generate atau upload gambar dulu sebelum bikin avatar AI.');
      setStatusErr(true);
      return;
    }
    const script = scene.avatarScript.trim() || scene.caption.trim();
    if (!script) {
      setStatus('Isi naskah avatar (atau caption) dulu sebelum generate avatar AI.');
      setStatusErr(true);
      return;
    }

    updateScene(id, { isGeneratingAvatar: true });
    setStatusErr(false);
    setStatus('Menghasilkan video avatar AI (bisa 20-40 detik)...');
    try {
      const res = await fetch('/api/video/avatar-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: scene.imageUrl, script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal generate avatar AI.');
      updateScene(id, { avatarVideoUrl: data.videoUrl });
      setStatus('Video avatar AI berhasil dibuat untuk scene ini.');
    } catch (err: any) {
      setStatus('Gagal generate avatar AI: ' + err.message);
      setStatusErr(true);
    } finally {
      updateScene(id, { isGeneratingAvatar: false });
    }
  };

  const toggleRecord = async (id: number) => {
    if (recordingSceneId === id) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (recordingSceneId !== null) { setStatus('Selesaikan rekaman scene lain dulu.'); setStatusErr(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const chunks: BlobPart[] = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      setRecordingSceneId(id);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          updateScene(id, { audioBlob: blob, audioUrl: url, audioDuration: tempAudio.duration });
          setRecordingSceneId(null);
          mediaRecorderRef.current = null;
        };
      };
      mr.start();
    } catch (err: any) {
      setStatus('Tidak bisa akses mic: ' + err.message);
      setStatusErr(true);
    }
  };

  const clearAudio = (id: number) => updateScene(id, { audioBlob: null, audioUrl: null, audioDuration: 0 });

  const playScene = useCallback((
    scene: Scene,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    destination: MediaStreamAudioDestinationNode,
    audioCtx: AudioContext,
    elapsedBefore: number,
    total: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const duration = scene.audioBlob ? scene.audioDuration : scene.manualDuration;
        let sourceNode: MediaElementAudioSourceNode | null = null;
        if (scene.audioBlob && scene.audioUrl) {
          const audioEl = new Audio(scene.audioUrl);
          sourceNode = audioCtx.createMediaElementSource(audioEl);
          sourceNode.connect(destination);
          audioEl.play();
        }
        const start = performance.now();
        const frame = (now: number) => {
          const elapsedInScene = (now - start) / 1000;
          const progress = Math.min(1, elapsedInScene / duration);
          drawCoverImage(ctx, canvas, img, progress, scene.kbDirection);
          drawCaption(ctx, canvas, scene.caption, Math.min(1, elapsedInScene * 3));
          setTimecode(`${fmtTime(elapsedBefore + elapsedInScene)} / ${fmtTime(total)}`);
          if (progress < 1) requestAnimationFrame(frame);
          else { sourceNode?.disconnect(); resolve(); }
        };
        requestAnimationFrame(frame);
      };
      img.src = scene.imageUrl as string;
    });
  }, []);

  const renderVideo = async () => {
    const validScenes = scenes.filter((s) => s.imageUrl);
    if (validScenes.length === 0) { setStatus('Tambahkan minimal 1 scene dengan gambar.'); setStatusErr(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);
    setStatusErr(false);
    setDownloadUrl(null);
    setResultVideoUrl(null);
    setStatus('Menyiapkan recorder...');

    try {
      const hasAnyAudio = validScenes.some((s) => !!s.audioBlob);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const destination = audioCtx.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);

      // kalau tidak ada scene yang pakai rekaman suara, rekam video-only saja
      // (menghindari kemungkinan bug muxing audio+video di beberapa browser)
      const combined = hasAnyAudio
        ? new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
          ])
        : new MediaStream([...canvasStream.getVideoTracks()]);

      const videoTrack = combined.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('Browser tidak bisa merekam canvas (video track kosong). Coba pakai Chrome/Edge terbaru.');
      }
      if (videoTrack.readyState !== 'live') {
        throw new Error(`Video track browser berstatus "${videoTrack.readyState}" (harusnya "live"). Coba muat ulang halaman lalu render lagi.`);
      }

      const candidateMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = candidateMimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = mimeType
        ? new MediaRecorder(combined, { mimeType })
        : new MediaRecorder(combined);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const total = validScenes.reduce((a, s) => a + (s.audioBlob ? s.audioDuration : s.manualDuration), 0);
      let elapsedBefore = 0;

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      // timeslice 250ms supaya data mengalir berkala, bukan cuma 1x di akhir
      recorder.start(250);

      // beri jeda singkat supaya recorder benar-benar aktif sebelum canvas mulai digambar
      await new Promise((r) => setTimeout(r, 150));

      setStatus('Merender video...');

      for (const scene of validScenes) {
        await playScene(scene, ctx, canvas, destination, audioCtx, elapsedBefore, total);
        elapsedBefore += scene.audioBlob ? scene.audioDuration : scene.manualDuration;
      }

      // minta chunk terakhir sebelum stop, lalu beri jeda supaya event sempat diproses
      if (recorder.state === 'recording') {
        recorder.requestData();
      }
      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();
      await stopped;

      const totalBytes = chunks.reduce((a, c) => a + (c as Blob).size, 0);
      if (totalBytes < 2000) {
        throw new Error(
          `Rekaman gagal (${totalBytes} byte, ${chunks.length} chunk, mimeType="${mimeType || 'default'}", audio=${hasAnyAudio}). Coba render ulang, atau kirim info ini ke developer.`
        );
      }

      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setResultVideoUrl(url);
      setDownloadUrl(url);
      setStatus(`Selesai. Video siap diunduh (${(totalBytes / 1024).toFixed(0)} KB, format WebM).`);
    } catch (err: any) {
      setStatus('Gagal render: ' + err.message);
      setStatusErr(true);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh', color: 'var(--text-cream)' }}>
      <style>{`
        :root{
          --bg-void:#15130f; --bg-panel:#201b14; --bg-panel-2:#2a2318; --bg-panel-3:#332a1c;
          --accent-amber:#e8a33d; --accent-amber-dim:#8a642a; --accent-teal:#4a8a80;
          --text-cream:#f3ede1; --text-muted:#b3a892; --border-line:#3a3226; --danger:#c1553d;
          --accent-violet:#8a6fd8;
        }
        .vs-wrap{max-width:1180px;margin:0 auto;padding:28px 20px 80px;font-family:'Inter',sans-serif;}
        .vs-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;border-bottom:1px solid var(--border-line);padding-bottom:18px;}
        .vs-brand{display:flex;align-items:center;gap:12px;}
        .vs-dot{width:12px;height:12px;border-radius:50%;background:var(--accent-amber);box-shadow:0 0 10px var(--accent-amber);}
        .vs-brand h1{font-family:'Space Grotesk',sans-serif;font-size:22px;margin:0;}
        .vs-tag{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;}
        .vs-counter{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--text-muted);border:1px solid var(--border-line);padding:6px 12px;border-radius:4px;background:var(--bg-panel);}
        .vs-counter b{color:var(--text-cream);}
        .vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
        @media (max-width:920px){.vs-grid{grid-template-columns:1fr;}}
        .vs-reel{position:relative;padding-left:22px;}
        .vs-reel::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background-image:radial-gradient(circle, var(--bg-void) 3px, transparent 3.5px);background-size:14px 22px;background-color:var(--bg-panel-3);border-radius:3px;}
        .vs-section-title{font-family:'Space Grotesk',sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent-amber);margin:0 0 14px;}
        .vs-scene-card{background:var(--bg-panel);border:1px solid var(--border-line);border-radius:8px;padding:14px;margin-bottom:14px;position:relative;}
        .vs-scene-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
        .vs-scene-num{font-family:'IBM Plex Mono',monospace;color:var(--accent-amber);font-size:13px;}
        .vs-scene-remove{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px 6px;}
        .vs-scene-remove:hover{color:var(--danger);}
        .vs-scene-body{display:grid;grid-template-columns:96px 1fr;gap:12px;}
        .vs-thumb{width:96px;height:96px;border-radius:6px;background:var(--bg-panel-2);border:1px dashed var(--border-line);display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center;cursor:pointer;overflow:hidden;flex-shrink:0;font-size:11px;color:var(--text-muted);text-align:center;padding:4px;}
        .vs-thumb:hover{border-color:var(--accent-amber);}
        .vs-cap{width:100%;min-height:56px;resize:vertical;background:var(--bg-panel-2);border:1px solid var(--border-line);border-radius:6px;color:var(--text-cream);font-family:'Inter',sans-serif;font-size:13px;padding:8px 10px;}
        .vs-cap:focus{outline:none;border-color:var(--accent-amber);}
        .vs-row-controls{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;}
        .vs-mini-btn{font-family:'IBM Plex Mono',monospace;font-size:11px;background:var(--bg-panel-2);border:1px solid var(--border-line);color:var(--text-cream);padding:6px 10px;border-radius:5px;cursor:pointer;}
        .vs-mini-btn:hover{border-color:var(--accent-amber);}
        .vs-mini-btn.rec-active{background:var(--danger);border-color:var(--danger);color:#fff;}
        .vs-mini-btn.has-audio{border-color:var(--accent-teal);color:var(--accent-teal);}
        .vs-dur-slider{display:flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-muted);}
        .vs-dur-slider input{width:80px;accent-color:var(--accent-amber);}
        .vs-add-scene{width:100%;padding:12px;border:1px dashed var(--border-line);border-radius:8px;background:transparent;color:var(--text-muted);font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.5px;cursor:pointer;text-transform:uppercase;}
        .vs-add-scene:hover{border-color:var(--accent-amber);color:var(--accent-amber);}
        .vs-preview-panel{position:sticky;top:20px;align-self:start;}
        .vs-screen{background:#000;border-radius:10px;overflow:hidden;position:relative;border:1px solid var(--border-line);}
        .vs-screen canvas, .vs-screen video{width:100%;display:block;aspect-ratio:16/9;background:#000;}
        .vs-timecode{position:absolute;bottom:10px;right:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;background:rgba(0,0,0,0.55);padding:4px 8px;border-radius:4px;}
        .vs-controls-bar{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}
        .vs-btn-primary{flex:1;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;background:var(--accent-amber);color:#221806;border:none;border-radius:7px;padding:13px 18px;cursor:pointer;}
        .vs-btn-primary:hover{background:#f2b356;}
        .vs-btn-primary:disabled{background:var(--accent-amber-dim);color:#4a3c22;cursor:not-allowed;}
        .vs-btn-secondary{font-family:'IBM Plex Mono',monospace;font-size:12px;background:transparent;color:var(--text-muted);border:1px solid var(--border-line);border-radius:7px;padding:13px 16px;cursor:pointer;}
        .vs-btn-secondary:hover{border-color:var(--accent-teal);color:var(--accent-teal);}
        .vs-status-line{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text-muted);margin-top:12px;min-height:16px;}
        .vs-status-line.err{color:var(--danger);}
        .vs-download-box{margin-top:16px;padding:14px;background:var(--bg-panel);border:1px solid var(--accent-teal);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .vs-download-box a{font-family:'Space Grotesk',sans-serif;font-weight:600;color:var(--accent-teal);text-decoration:none;font-size:13px;background:rgba(74,138,128,0.15);padding:9px 14px;border-radius:6px;}
        .vs-note{font-family:'Inter',sans-serif;font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:16px;padding:12px 14px;background:var(--bg-panel);border-radius:8px;border:1px solid var(--border-line);}
        .vs-note b{color:var(--text-cream);}
        .vs-ai-box{margin-top:10px;padding:10px;background:var(--bg-panel-2);border:1px solid var(--border-line);border-radius:6px;}
        .vs-ai-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;}
        .vs-ai-input{flex:1;min-width:140px;background:var(--bg-panel);border:1px solid var(--border-line);border-radius:5px;color:var(--text-cream);font-family:'Inter',sans-serif;font-size:12px;padding:7px 9px;}
        .vs-ai-input:focus{outline:none;border-color:var(--accent-teal);}
        .vs-ai-select{background:var(--bg-panel);border:1px solid var(--border-line);border-radius:5px;color:var(--text-cream);font-family:'IBM Plex Mono',monospace;font-size:11px;padding:7px 6px;}
        .vs-ai-btn{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;background:var(--accent-teal);color:#0f1e1b;border:none;border-radius:5px;padding:8px 12px;cursor:pointer;white-space:nowrap;}
        .vs-ai-btn:hover{background:#5da296;}
        .vs-ai-btn:disabled{background:#2f4b46;color:#7d9b95;cursor:not-allowed;}
        .vs-ai-label{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;}
        .vs-avatar-box{margin-top:10px;padding:10px;background:var(--bg-panel-2);border:1px solid var(--border-line);border-radius:6px;}
        .vs-avatar-btn{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;background:var(--accent-violet);color:#160f2e;border:none;border-radius:5px;padding:8px 12px;cursor:pointer;white-space:nowrap;}
        .vs-avatar-btn:hover{background:#a58ce8;}
        .vs-avatar-btn:disabled{background:#3a3352;color:#8a80a8;cursor:not-allowed;}
        .vs-avatar-preview{margin-top:10px;border-radius:6px;overflow:hidden;border:1px solid var(--accent-violet);}
        .vs-avatar-preview video{width:100%;display:block;background:#000;}
      `}</style>

      <div className="vs-wrap">
        <header className="vs-header">
          <div className="vs-brand">
            <div className="vs-dot" />
            <div>
              <h1>Video Studio</h1>
              <div className="vs-tag">Narasi · Gambar · Caption &rarr; Video · Gratis di Browser</div>
            </div>
          </div>
          <div className="vs-counter">
            SCENE <b>{scenes.length}</b> &nbsp;|&nbsp; DURASI <b>{fmtTime(totalDuration)}</b>
          </div>
        </header>

        <div className="vs-grid">
          <div>
            <p className="vs-section-title">Susun Scene</p>
            <div className="vs-reel">
              {scenes.map((scene, idx) => (
                <div className="vs-scene-card" key={scene.id}>
                  <div className="vs-scene-head">
                    <span className="vs-scene-num">SCENE {String(idx + 1).padStart(2, '0')}</span>
                    <button className="vs-scene-remove" onClick={() => removeScene(scene.id)}>✕</button>
                  </div>
                  <div className="vs-scene-body">
                    <div
                      className="vs-thumb"
                      style={scene.imageUrl ? { backgroundImage: `url(${scene.imageUrl})` } : {}}
                      onClick={() => fileInputRefs.current[scene.id]?.click()}
                    >
                      {scene.isGeneratingImage ? '⏳ ...' : (!scene.imageUrl && '+ Gambar')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <textarea
                        className="vs-cap"
                        placeholder="Tulis narasi / caption scene ini..."
                        value={scene.caption}
                        onChange={(e) => updateScene(scene.id, { caption: e.target.value })}
                      />
                      <div className="vs-row-controls">
                        <button
                          className={`vs-mini-btn ${scene.audioBlob ? 'has-audio' : ''} ${recordingSceneId === scene.id ? 'rec-active' : ''}`}
                          onClick={() => toggleRecord(scene.id)}
                        >
                          {recordingSceneId === scene.id
                            ? '⏺ Rekam... (klik utk stop)'
                            : scene.audioBlob
                              ? `✓ Suara (${scene.audioDuration.toFixed(1)}s)`
                              : '🎤 Rekam Suara'}
                        </button>
                        <button className="vs-mini-btn" onClick={() => speakCaption(scene.caption)}>🔊 Coba Baca</button>
                        <button
                          className="vs-mini-btn"
                          disabled={scene.isGeneratingVoice}
                          onClick={() => generateSceneVoice(scene.id)}
                        >
                          {scene.isGeneratingVoice ? '⏳ Membuat suara...' : '🗣️ Generate Suara AI'}
                        </button>
                        {scene.audioBlob && (
                          <button className="vs-mini-btn" onClick={() => clearAudio(scene.id)}>Hapus Suara</button>
                        )}
                        {!scene.audioBlob && (
                          <div className="vs-dur-slider">
                            <span>Durasi</span>
                            <input
                              type="range" min={1} max={12} step={0.5}
                              value={scene.manualDuration}
                              onChange={(e) => updateScene(scene.id, { manualDuration: +e.target.value })}
                            />
                            <span>{scene.manualDuration}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="vs-ai-box">
                    <span className="vs-ai-label">✨ Generate Gambar AI</span>
                    <div className="vs-ai-row">
                      <input
                        className="vs-ai-input"
                        type="text"
                        placeholder="Prompt gambar (kosongkan utk pakai caption)"
                        value={scene.imagePrompt}
                        onChange={(e) => updateScene(scene.id, { imagePrompt: e.target.value })}
                      />
                      <select
                        className="vs-ai-select"
                        value={scene.imageProvider}
                        onChange={(e) => updateScene(scene.id, { imageProvider: e.target.value as Scene['imageProvider'] })}
                      >
                        <option value="pollinations">Pollinations (Gratis)</option>
                        <option value="gemini">Gemini</option>
                      </select>
                      <button
                        className="vs-ai-btn"
                        disabled={scene.isGeneratingImage}
                        onClick={() => generateSceneImage(scene.id)}
                      >
                        {scene.isGeneratingImage ? 'Membuat...' : '✨ Generate Gambar AI'}
                      </button>
                    </div>
                  </div>

                  <div className="vs-avatar-box">
                    <span className="vs-ai-label">🧑‍🎤 Generate Avatar AI (talking-head)</span>
                    <div className="vs-ai-row">
                      <input
                        className="vs-ai-input"
                        type="text"
                        placeholder="Naskah avatar (kosongkan utk pakai caption)"
                        value={scene.avatarScript}
                        onChange={(e) => updateScene(scene.id, { avatarScript: e.target.value })}
                      />
                      <button
                        className="vs-avatar-btn"
                        disabled={scene.isGeneratingAvatar}
                        onClick={() => generateSceneAvatar(scene.id)}
                      >
                        {scene.isGeneratingAvatar ? 'Membuat avatar...' : '🧑‍🎤 Generate Avatar AI'}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      Pakai gambar scene ini (dari + Gambar / Generate Gambar AI di atas) sebagai wajah avatar, lalu dibuat ngomong sesuai naskah. Prosesnya 20-40 detik.
                    </div>
                    {scene.avatarVideoUrl && (
                      <div className="vs-avatar-preview">
                        <video src={scene.avatarVideoUrl} controls />
                      </div>
                    )}
                  </div>

                  <input
                    type="file" accept="image/*" style={{ display: 'none' }}
                    ref={(el) => { fileInputRefs.current[scene.id] = el; }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(scene.id, f); }}
                  />
                </div>
              ))}
            </div>
            <button className="vs-add-scene" onClick={addScene}>+ Tambah Scene</button>
          </div>

          <div className="vs-preview-panel">
            <p className="vs-section-title">Preview &amp; Render</p>
            <div className="vs-screen">
              {resultVideoUrl ? (
                <video src={resultVideoUrl} controls />
              ) : (
                <canvas ref={canvasRef} width={1280} height={720} />
              )}
              <div className="vs-timecode">{timecode}</div>
            </div>
            <div className="vs-controls-bar">
              <button className="vs-btn-primary" disabled={isRendering} onClick={renderVideo}>▶ Render Video</button>
              <button className="vs-btn-secondary" onClick={() => window.location.reload()}>Reset</button>
            </div>
            <div className={`vs-status-line ${statusErr ? 'err' : ''}`}>{status}</div>
            {downloadUrl && (
              <div className="vs-download-box">
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--text-muted)' }}>Video siap ✓</span>
                <a href={downloadUrl} download="video-studio-export.webm">Unduh Video</a>
              </div>
            )}
            <div className="vs-note">
              <b>Cara narasi:</b> tiap scene punya tombol <b>🎤 Rekam Suara</b> (mic Anda sendiri), <b>🔊 Coba Baca</b> (Text-to-Speech browser, hanya pratinjau — tidak ikut ke video), dan <b>🗣️ Generate Suara AI</b> (suara wanita hasil AI, otomatis ikut ke video hasil render, dari isi caption scene). Tanpa suara sama sekali, durasi scene pakai slider manual dan bagian itu senyap.
              <br /><br />
              <b>Generate Gambar AI:</b> isi prompt (atau kosongkan untuk memakai caption scene), pilih provider, lalu klik tombol. Pollinations gratis tanpa API key; Gemini butuh <code>GEMINI_API_KEY</code> di Environment Variables.
              <br /><br />
              <b>Generate Avatar AI:</b> butuh gambar scene terisi dulu (wajah/produk yang mau "ngomong"), lalu isi naskah. Video avatar hasilnya terpisah dari video hasil Render Video biasa — unduh manual dari kotak pratinjau avatar. Butuh <code>DID_API_KEY</code> di Environment Variables.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

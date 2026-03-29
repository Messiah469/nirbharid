import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = 'http://localhost:3001'

export default function App() {
  const [mode, setMode] = useState('menu')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pasteToken, setPasteToken] = useState('')
  const scannerRef = useRef(null)

  const startScanner = async () => {
    setMode('scanning')
    setTimeout(() => {
      if (window.Html5QrcodeScanner) {
        const sc = new window.Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 260 }, false)
        sc.render(async (text) => {
          sc.clear(); scannerRef.current = null; setMode('menu')
          await verify(text)
        }, () => {})
        scannerRef.current = sc
      }
    }, 200)
  }

  const stopScanner = () => {
    if (scannerRef.current) { try { scannerRef.current.clear() } catch(e) {} scannerRef.current = null }
    setMode('menu')
  }

  const verify = async (token) => {
    setLoading(true); setResult(null)
    try {
      const r = await fetch(API + '/verify-credential', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ token: token.trim() })
      })
      const d = await r.json()
      setResult(d); setMode('result')
    } catch(e) { setResult({ valid: false, message: 'Cannot connect to backend server. Make sure it is running.' }); setMode('result') }
    setLoading(false)
  }

  return (
    <div className="app">
      <div className="hdr">
        <div className="hdr-icon">🔍</div>
        <div><h1>NirbharID Verifier</h1><p>Verify worker credentials instantly</p></div>
      </div>

      {mode === 'menu' && (
        <div className="card">
          <button className="btn-primary" onClick={startScanner}>Scan QR Code</button>
          <div className="or">OR paste token manually</div>
          <textarea className="token-in" rows={4} placeholder="Paste credential token here..." value={pasteToken} onChange={e => setPasteToken(e.target.value)}/>
          <button className="btn-outline" onClick={() => verify(pasteToken)} disabled={!pasteToken.trim()}>Verify Token</button>
        </div>
      )}

      {mode === 'scanning' && (
        <div className="card">
          <div id="qr-reader"></div>
          <button className="btn-cancel" onClick={stopScanner}>Cancel</button>
        </div>
      )}

      {loading && <div className="loading"><div className="spinner"></div><p>Verifying...</p></div>}

{mode === 'result' && result && (
        <div className={`result ${result.valid ? 'valid' : 'invalid'}`}>
          <div className="r-icon">{result.valid ? '✓' : '✗'}</div>
          <h2>{result.valid ? 'Credential Valid' : 'Credential Invalid'}</h2>
          <p className="r-msg">{result.message}</p>
          {result.valid && result.credential && (
            <div className="details">
              <div className="d-row"><span className="dlabel">Type</span><span>{result.credential.type?.[1] || 'WorkerCredential'}</span></div>
              <div className="d-row"><span className="dlabel">Issuer</span><span>{result.credential.issuer?.name}</span></div>
              {result.credential.credentialSubject?.workerName && <div className="d-row"><span className="dlabel">Worker</span><span>{result.credential.credentialSubject.workerName}</span></div>}
              {result.credential.credentialSubject?.skillName && <div className="d-row"><span className="dlabel">Skill</span><span>{result.credential.credentialSubject.skillName}</span></div>}
              {result.credential.credentialSubject?.nqfLevel && <div className="d-row"><span className="dlabel">Level</span><span>NQF Level {result.credential.credentialSubject.nqfLevel}</span></div>}
              <div className="d-row"><span className="dlabel">Issued</span><span>{new Date(result.credential.issuanceDate).toLocaleDateString()}</span></div>
              <div className="d-row mono"><span className="dlabel">Worker DID</span><span>{result.credential.credentialSubject?.id?.slice(0,38)}...</span></div>
            </div>
          )}
          <button className="btn-reset" onClick={() => { setResult(null); setMode('menu'); setPasteToken(''); }}>Verify Another</button>
        </div>
      )}
    </div>
  )
}

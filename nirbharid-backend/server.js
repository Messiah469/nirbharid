const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = 'nirbharid-demo-secret-2024';
const didRegistry = {};
const credentialRegistry = {};

app.get('/', (req, res) => {
  res.json({ status: 'NirbharID Backend running!', dids: Object.keys(didRegistry).length });
});

app.post('/create-did', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone required' });
  const did = 'did:nirbhar:' + uuidv4();
  didRegistry[did] = { did, name, phone, created: new Date().toISOString(), active: true };
  console.log('DID created:', did);
  res.json({ success: true, did, message: 'Identity created!' });
});

app.post('/issue-credential', (req, res) => {
  const { workerDid, credentialType, claims, issuerName } = req.body;
  if (!didRegistry[workerDid]) return res.status(400).json({ success: false, message: 'Worker DID not found' });
  const credId = 'vc:nirbhar:' + uuidv4();
  const credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: credId,
    type: ['VerifiableCredential', credentialType || 'WorkerCredential'],
    issuer: { id: 'did:nirbhar:issuer-' + (issuerName || 'unknown').toLowerCase().replace(/\s/g,'-'), name: issuerName || 'Unknown Issuer' },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: workerDid, ...claims }
  };
  const token = jwt.sign(credential, SECRET_KEY, { expiresIn: '365d' });
  credentialRegistry[credId] = { credential, token, revoked: false };
  console.log('Credential issued:', credId);
  res.json({ success: true, credentialId: credId, credential, token });
});

app.post('/verify-credential', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, valid: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const record = credentialRegistry[decoded.id];
    if (!record || record.revoked) {
      return res.json({ success: true, valid: false, message: 'Credential has been revoked or not found in registry' });
    }
    res.json({ success: true, valid: true, credential: decoded, message: 'Credential is valid and authentic!' });
  } catch (err) {
    res.json({ success: true, valid: false, message: 'Invalid or expired credential: ' + err.message });
  }
});

app.post('/revoke-credential', (req, res) => {
  const { credentialId } = req.body;
  if (credentialRegistry[credentialId]) {
    credentialRegistry[credentialId].revoked = true;
    res.json({ success: true, message: 'Credential revoked' });
  } else {
    res.status(404).json({ success: false, message: 'Credential not found' });
  }
});

app.get('/did/:did', (req, res) => {
  const record = didRegistry[decodeURIComponent(req.params.did)];
  if (!record) return res.status(404).json({ success: false, message: 'DID not found' });
  res.json({ success: true, ...record });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('NirbharID Backend running at http://localhost:' + PORT);
  console.log('Test it: http://localhost:3001/');
});
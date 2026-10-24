import jwt from 'jsonwebtoken';

/*
  Minimal read-only Google Sheets client.

  Deliberately not the `googleapis` package: it pulls in every Google API and
  weighs tens of megabytes, which is dead weight in a serverless bundle when
  all this needs is one GET. A service-account JWT exchanged for an access
  token is the whole protocol, and jsonwebtoken is already a dependency.

  Tokens last an hour and are cached for the life of the process, so a warm
  function reuses one rather than re-authenticating per request.
*/

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// Refresh a minute early so a token cannot expire mid-request.
const EXPIRY_MARGIN_MS = 60_000;

interface CachedToken {
  value: string;
  expiresAt: number;
}

export class GoogleSheetsClient {
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private cached: CachedToken | null = null;

  constructor() {
    const clientEmail = process.env['GOOGLE_SHEETS_CLIENT_EMAIL'];
    const privateKey = process.env['GOOGLE_SHEETS_PRIVATE_KEY'];

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Missing GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY',
      );
    }

    this.clientEmail = clientEmail;
    // Env files carry the key as a single line with escaped newlines; PEM
    // parsing needs the real ones back.
    this.privateKey = privateKey.replace(/\\n/g, '\n');
  }

  /*
    Returns the requested range as rows of raw cell strings.

    Trailing empty cells are omitted by the API, so rows are not all the same
    length — callers must index defensively rather than assume a width.
  */
  async getRows(spreadsheetId: string, range: string): Promise<string[][]> {
    const token = await this.accessToken();

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
      `/values/${encodeURIComponent(range)}` +
      // Formatted values so dates read as they appear in the sheet rather than
      // as serial numbers, and UNFORMATTED would also drop leading zeros from
      // phone numbers.
      `?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 403) {
        throw new Error(
          `Sheets API denied access (403). Is the sheet shared with ${this.clientEmail}? ${body.slice(0, 200)}`,
        );
      }
      if (res.status === 404) {
        throw new Error(`Spreadsheet ${spreadsheetId} not found (404).`);
      }
      throw new Error(`Sheets API ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { values?: string[][] };
    return json.values ?? [];
  }

  private async accessToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt - EXPIRY_MARGIN_MS) {
      return this.cached.value;
    }

    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      {
        iss: this.clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      },
      this.privateKey,
      { algorithm: 'RS256' },
    );

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cached = {
      value: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return this.cached.value;
  }
}

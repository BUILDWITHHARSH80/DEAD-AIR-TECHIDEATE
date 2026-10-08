import type { ReactNode } from 'react';
import { AudioLines, FileLock2, MapPin, Paperclip, Radio, Stamp } from 'lucide-react';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';

export type DossierPhoto = {
  src: string;
  alt: string;
  caption?: string;
};

export type DossierAudioLog = {
  src: string;
  title: string;
  transcript?: string;
};

export type DossierRecord = {
  id: string;
  title: string;
  classification?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  question?: string;
  clues?: string[];
  photos?: DossierPhoto[];
  audioLogs?: DossierAudioLog[];
  corrupted?: boolean;
};

type DossierProps = {
  record: DossierRecord;
  state: 'pending' | 'approved' | 'recovered';
  unlockedAt?: string;
  children?: ReactNode;
};

/** Presentation shell for a file. The children slot keeps the archive's existing
 * passkey form and decrypted-content behavior in control of the parent screen. */
export function Dossier({ record, state, unlockedAt, children }: DossierProps) {
  const recovered = state === 'recovered';
  const photos = recovered ? record.photos ?? [] : [];
  const audioLogs = recovered ? record.audioLogs ?? [] : [];
  const clues = recovered ? record.clues ?? [] : [];

  return (
    <article className="dossier-sheet" data-corrupted={record.corrupted || undefined}>
      <span className="dossier-pin" aria-hidden="true" />
      <header className="dossier-header">
        <div className="dossier-mark"><Radio size={17} /> RADIO MERIDIAN <span>ARCHIVE / 87.6</span></div>
        <div className={`dossier-stamp dossier-stamp--${state}`}><Stamp size={14} /> {state === 'recovered' ? 'DECRYPTED' : state === 'approved' ? 'ACCESS AUTHORIZED' : 'SEALED'}</div>
      </header>

      <div className="dossier-ident">
        <p className="dossier-kicker">CASE FILE {record.id} <span>•</span> {record.classification || 'INVESTIGATION RECORD'}</p>
        <DialogTitle className="dossier-title">{record.title}</DialogTitle>
        <DialogDescription className="dossier-subtitle">{record.subtitle || record.description || 'Recovered material from the Meridian incident archive.'}</DialogDescription>
        <div className="dossier-meta"><span>INCIDENT / 02:13:47</span><span>ACCESS / {state.toUpperCase()}</span>{unlockedAt && <time>{unlockedAt}</time>}</div>
      </div>

      <div className="dossier-rule"><span>FIELD NOTES &amp; RECOVERED MATERIAL</span><Paperclip size={15} /></div>

      <div className="dossier-layout">
        <main className="dossier-main">
          {photos.length > 0 && <section className="dossier-photos" aria-label="Evidence photographs">
            {photos.map((photo, index) => <figure className="dossier-photo" key={`${photo.src}-${index}`}>
              <span className="dossier-photo-pin" aria-hidden="true" />
              {/* Evidence images are supplied by the caller; no remote assets are assumed. */}
              <img src={photo.src} alt={photo.alt} loading="lazy" />
              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>)}
          </section>}

          <section className="dossier-record" aria-label={recovered ? 'Decrypted file contents' : 'Encrypted file status'}>
            <p className="dossier-section-label"><FileLock2 size={14} /> {recovered ? 'TRANSCRIPT / VERIFIED COPY' : 'RECORD / ENCRYPTED'}</p>
            {children || (recovered && record.content
              ? <div className="dossier-transcript">{record.content}</div>
              : <div className="dossier-redacted" aria-label="File contents locked"><span>MERIDIAN ARCHIVE</span><b>CONTENT SEALED UNTIL PASSKEY VERIFICATION</b><i>████████ ███████ ██████ ████████</i></div>)}
          </section>

          {audioLogs.length > 0 && <section className="dossier-audio-logs" aria-label="Audio logs">
            <p className="dossier-section-label"><AudioLines size={15} /> AUDIO LOGS / {String(audioLogs.length).padStart(2, '0')}</p>
            {audioLogs.map((log, index) => <div className="dossier-audio" key={`${log.src}-${index}`}>
              <div><span>REEL {String(index + 1).padStart(2, '0')}</span><strong>{log.title}</strong></div>
              <audio controls preload="none" src={log.src}>Audio playback is not supported by this browser.</audio>
              {log.transcript && <details><summary>READ TRANSCRIPT</summary><p>{log.transcript}</p></details>}
            </div>)}
          </section>}
        </main>

        <aside className="dossier-margin" aria-label="Investigator notes">
          <div className="dossier-index"><MapPin size={14} /><span>MERIDIAN<br />MUNICIPAL<br />BROADCASTING</span><b>021347</b></div>
          {recovered && record.question && <div className="dossier-handnote"><small>QUESTION STILL OPEN</small><p>{record.question}</p></div>}
          {clues.map((clue, index) => <div className="dossier-handnote" key={`${index}-${clue}`}><small>FIELD NOTE / {String(index + 1).padStart(2, '0')}</small><p>{clue}</p></div>)}
          {(!recovered || (!record.question && clues.length === 0)) && <div className="dossier-handnote"><small>INVESTIGATOR NOTE</small><p>Keep the original. Separate what was seen from what was assumed.</p></div>}
          {record.corrupted && <p className="dossier-corruption" role="status">SIGNAL CORRUPTION DETECTED</p>}
        </aside>
      </div>

      <footer className="dossier-footer"><span>CHAIN OF CUSTODY / MERIDIAN ARCHIVE</span><span>{recovered ? 'COPY VERIFIED' : 'DO NOT DUPLICATE'}</span></footer>
    </article>
  );
}

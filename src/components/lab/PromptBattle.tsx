import { useState } from 'preact/hooks';

interface Round {
  promptA: string;
  promptB: string;
  responseA: string;
  responseB: string;
  winner: 'A' | 'B' | 'draw';
}

export default function PromptBattle() {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [rounds, setRounds] = useState<Round[]>([]);

  const winsA = rounds.filter((r) => r.winner === 'A').length;
  const winsB = rounds.filter((r) => r.winner === 'B').length;
  const draws = rounds.filter((r) => r.winner === 'draw').length;

  const canVote = promptA.trim() || promptB.trim() || responseA.trim() || responseB.trim();

  function vote(winner: 'A' | 'B' | 'draw') {
    setRounds((prev) => [
      ...prev,
      { promptA, promptB, responseA, responseB, winner },
    ]);
    setPromptA('');
    setPromptB('');
    setResponseA('');
    setResponseB('');
  }

  function reset() {
    setPromptA('');
    setPromptB('');
    setResponseA('');
    setResponseB('');
    setRounds([]);
  }

  const leader =
    winsA > winsB ? 'A' : winsB > winsA ? 'B' : rounds.length > 0 ? 'tied' : null;

  return (
    <div class="space-y-6">
      {/* Scoreboard */}
      <div class="bg-surface border border-surface-light rounded-lg p-5">
        <div class="font-mono text-xs text-text-muted uppercase tracking-wider mb-4">Scoreboard</div>
        <div class="grid grid-cols-4 gap-3 text-center">
          <div>
            <div class="font-mono text-2xl font-bold text-neon-cyan">{rounds.length}</div>
            <div class="font-mono text-xs text-text-muted mt-1">rounds</div>
          </div>
          <div>
            <div class={`font-mono text-2xl font-bold ${winsA > winsB ? 'text-neon-green' : 'text-text-bright'}`}>{winsA}</div>
            <div class="font-mono text-xs text-text-muted mt-1">A wins</div>
          </div>
          <div>
            <div class={`font-mono text-2xl font-bold ${winsB > winsA ? 'text-neon-green' : 'text-text-bright'}`}>{winsB}</div>
            <div class="font-mono text-xs text-text-muted mt-1">B wins</div>
          </div>
          <div>
            <div class="font-mono text-2xl font-bold text-text-muted">{draws}</div>
            <div class="font-mono text-xs text-text-muted mt-1">draws</div>
          </div>
        </div>
        {leader && (
          <div class="mt-4 text-center font-mono text-sm text-neon-green">
            {leader === 'tied' ? '— tied —' : `Prompt ${leader} is winning`}
          </div>
        )}
      </div>

      {/* Prompt inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Prompt A
          </label>
          <textarea
            value={promptA}
            onInput={(e) => setPromptA((e.target as HTMLTextAreaElement).value)}
            placeholder="Write or paste prompt A here..."
            class="w-full h-36 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Response A
          </label>
          <textarea
            value={responseA}
            onInput={(e) => setResponseA((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste the AI response for prompt A..."
            class="w-full h-48 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
        </div>
        <div class="space-y-3">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Prompt B
          </label>
          <textarea
            value={promptB}
            onInput={(e) => setPromptB((e.target as HTMLTextAreaElement).value)}
            placeholder="Write or paste prompt B here..."
            class="w-full h-36 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Response B
          </label>
          <textarea
            value={responseB}
            onInput={(e) => setResponseB((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste the AI response for prompt B..."
            class="w-full h-48 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
        </div>
      </div>

      {/* Vote row */}
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-mono text-xs text-text-muted uppercase tracking-wider">Pick winner:</span>
        <button
          onClick={() => vote('A')}
          disabled={!canVote}
          class="px-5 py-2 bg-surface border border-neon-cyan/40 rounded-lg font-mono text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          A wins
        </button>
        <button
          onClick={() => vote('B')}
          disabled={!canVote}
          class="px-5 py-2 bg-surface border border-neon-purple/40 rounded-lg font-mono text-sm text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          B wins
        </button>
        <button
          onClick={() => vote('draw')}
          disabled={!canVote}
          class="px-5 py-2 bg-surface border border-surface-light rounded-lg font-mono text-sm text-text-muted hover:text-text-bright hover:border-text-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Draw
        </button>
        <div class="flex-1" />
        <button
          onClick={reset}
          class="px-4 py-2 bg-surface border border-surface-light rounded-lg font-mono text-xs text-text-muted hover:text-text-bright transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Round history */}
      {rounds.length > 0 && (
        <div class="space-y-3">
          <div class="font-mono text-xs text-text-muted uppercase tracking-wider">Round history</div>
          <div class="space-y-2">
            {rounds.map((r, i) => (
              <div key={i} class="bg-surface border border-surface-light rounded-lg px-4 py-3 flex items-center gap-4">
                <span class="font-mono text-xs text-text-muted shrink-0">#{i + 1}</span>
                <span class={`font-mono text-xs font-bold shrink-0 ${
                  r.winner === 'A' ? 'text-neon-cyan' : r.winner === 'B' ? 'text-neon-purple' : 'text-text-muted'
                }`}>
                  {r.winner === 'draw' ? 'draw' : `${r.winner} wins`}
                </span>
                <span class="font-mono text-xs text-text-muted truncate">
                  {r.promptA.trim() || r.promptB.trim()
                    ? `A: "${(r.promptA || '—').slice(0, 40)}…" / B: "${(r.promptB || '—').slice(0, 40)}…"`
                    : 'no prompts recorded'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p class="font-mono text-xs text-text-muted">
        Each round records your prompts and responses locally. Nothing is sent anywhere. Reset clears all history.
      </p>
    </div>
  );
}

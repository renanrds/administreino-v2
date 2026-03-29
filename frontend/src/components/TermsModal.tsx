import { AlertTriangle } from 'lucide-react';

interface TermsModalProps {
  onAccept: () => void;
  isLoading?: boolean;
}

export default function TermsModal({ onAccept, isLoading = false }: TermsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end z-[100]">
      <div className="w-full bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col"
        style={{ height: 'min(92vh, 820px)' }}>
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm flex items-start gap-3">
          <AlertTriangle size={24} style={{ color: '#f59e0b', marginTop: '2px' }} />
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">Termos de Isenção de Responsabilidade</h2>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Leia com atenção antes de usar a aplicação</p>
          </div>
          <button
            disabled={isLoading}
            onClick={onAccept}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              background: isLoading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#ffffff'
            }}
          >
            {isLoading ? '...' : 'Aceitar'}
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto px-6 py-6 flex-1"
        >
          <div style={{ color: '#cbd5e1' }} className="space-y-4 text-sm leading-relaxed">
            <div>
              <h3 className="font-bold text-white mb-2">1. Sobre os Treinos Gerados por IA</h3>
              <p>
                Os treinos gerados pela inteligência artificial nesta aplicação são ferramentas de apoio e facilitadores para ajudar você a estruturar seus programas de exercício. Eles são baseados em padrões gerais de treinamento e não substituem a orientação de um profissional qualificado.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">2. Isenção de Responsabilidade Profissional</h3>
              <p>
                <strong style={{ color: '#f1f5f9' }}>IMPORTANTE:</strong> A Administreino é um facilitador e NÃO é um profissional de educação física, personal trainer ou profissional de saúde. Os treinos sugeridos não substituem a avaliação e acompanhamento de um profissional qualificado.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">3. Responsabilidade do Usuário</h3>
              <p>
                Você é responsável por:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1" style={{ color: '#cbd5e1' }}>
                <li>Avaliar sua saúde geral e limitações físicas antes de seguir qualquer treino</li>
                <li>Consultar um médico ou profissional de saúde qualificado se tiver dúvidas sobre sua capacidade de exercicio</li>
                <li>Adaptar os treinos de acordo com suas capacidades e limitações pessoais</li>
                <li>Realizar os exercícios com técnica adequada para evitar lesões</li>
                <li>Suspender qualquer exercício que cause dor ou desconforto anormal</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">4. Variações Individuais</h3>
              <p>
                Cada pessoa é única. O que funciona para uma pessoa pode não funcionar para outra.  Fatores como idade, condição física atual, histórico de lesões, genética e outros aspectos individuais afetam os resultados.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">5. Limitação de Responsabilidade</h3>
              <p>
                A Administreino não será responsável por qualquer lesão, indenização ou dano resultante do uso dos treinos gerados, mal-entendidos ou aplicação incorreta dos mesmos. Você utiliza os treinos por sua conta e risco.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">6. Procure Orientação Profissional</h3>
              <p>
                Para melhores resultados e segurança, recomendamos trabalhar com um personal trainer certificado ou profissional de educação física qualificado que possa avaliar individualmente seu caso.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">7. Consentimento</h3>
              <p>
                Ao aceitar estes termos, você confirma que entende e aceita os riscos associados ao uso dessa aplicação para gerar e executar treinos, e que usará a aplicação por sua conta e risco.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm px-6 py-4 pb-6 safe-bottom flex gap-3">
          <button
            disabled={isLoading}
            onClick={onAccept}
            style={{
              background: isLoading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#ffffff'
            }}
            className="flex-1 py-3 rounded-xl font-bold transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processando...' : 'Aceitar Termos'}
          </button>
        </div>
      </div>
    </div>
  );
}

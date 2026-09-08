import { Component, type ReactNode } from "react";
export class AtlasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="access-gate" role="alert">
        <h1>Vamos reabrir o atlas.</h1>
        <p>
          O visualizador encontrou um problema neste navegador. Sua navegação e seu caderno
          continuam disponíveis.
        </p>
        <a className="button dark" href="/atlas">
          Reabrir atlas 3D
        </a>
        <a href="/estudar">Voltar ao meu espaço</a>
      </div>
    ) : (
      this.props.children
    );
  }
}

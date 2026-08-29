# Portfólio — Gabriel Alderige

Site pessoal. Desenvolvedor full-stack, professor e coordenador de programação e
robótica no CNA de Poços de Caldas.

## Como rodar

Não tem build. Abra `index.html` no navegador, ou sirva a pasta:

```bash
python -m http.server 8000
```

## Estrutura

```
index.html              página inteira, conteúdo estático
assets/css/style.css    tokens + componentes
assets/js/scene.js      cena WebGL do topo (Three.js r128, via CDN)
assets/js/motion.js     reveal, scrollspy, contadores, estado da nav
assets/img/retrato.png  retrato recortado, com canal alpha
```

## Design

Tema único: fósforo azul sobre preto — uma sala escura com um CRT como única
fonte de luz. Os tokens ficam todos no `:root` de `style.css`.

| Papel | Valor |
|---|---|
| Canvas | `#000000` |
| Superfície | `#0b0f14` |
| Elevado | `#131a23` |
| Hairline | `#27384b` |
| Acento | `#4d8dff` — **um preenchimento por viewport** |
| Texto | `#dce8ff` |
| Corpo | `#8397b5` |

Tipografia: Inter Tight (display), Inter (UI e corpo), JetBrains Mono (código e
dados numéricos).

A cena do topo é um grafo: núcleo icosaédrico em wireframe, 96 nós à deriva e
1100 partículas de campo distante. As arestas são reconstruídas a cada frame por
proximidade — as próximas queimam forte, as distantes somem. Ao rolar, o grafo
se dispersa e apaga.

`prefers-reduced-motion` é respeitado: um frame estático, sem loop de animação.

## Como editar

- **Números da faixa de stats** — atributo `data-count` (e `data-suffix`)
- **Barras da seção Stack** — atributo `data-level` (percentual)
- **Depoimentos** — a seção existe comentada no `index.html`; descomente quando
  houver depoimentos reais
- **Certificações** — entram como novas linhas `.post` na seção Formação

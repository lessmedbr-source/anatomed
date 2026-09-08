export type SystemId = 'skeletal'|'muscular'|'arterial'|'venous'|'nervous'|'digestive'|'respiratory'|'urinary'|'reproductive'|'lymphatic'|'endocrine'|'integumentary'|'connective'|'sensory'|'cardiac';
export const SYSTEMS: {id:SystemId;name:string;color:string;description:string}[] = [
 {id:'skeletal',name:"Esqueleto",color:'#e2d9ba',description:"Os ossos sustentam o corpo, protegem órgãos e servem de apoio para os músculos. Também armazenam minerais; a medula óssea participa da produção das células do sangue."},
 {id:'muscular',name:"Músculos",color:'#a85b50',description:"Os músculos esqueléticos produzem movimento ao se contrair. Junto com os tendões, movimentam as articulações, estabilizam a postura e ajudam a produzir calor."},
 {id:'cardiac',name:"Coração",color:'#b96760',description:"O coração é uma bomba muscular com quatro cavidades. Suas valvas orientam o fluxo de sangue entre o coração, os pulmões e o restante do corpo."},
 {id:'sensory',name:"Órgãos dos sentidos",color:'#b0c8ce',description:"Estas estruturas participam de sentidos como visão, audição e equilíbrio. Seus tecidos captam estímulos e trabalham com o sistema nervoso para transmitir informações."},
 {id:'arterial',name:"Artérias",color:'#c05245',description:"As artérias conduzem o sangue para fora do coração. Na circulação do corpo, levam sangue aos tecidos; na circulação pulmonar, levam sangue aos pulmões."},
 {id:'venous',name:"Veias",color:'#527c9f',description:"As veias conduzem o sangue de volta ao coração. Redes superficiais e profundas recolhem o sangue dos tecidos. As veias pulmonares trazem dos pulmões o sangue que recebeu oxigênio."},
 {id:'nervous',name:"Sistema nervoso",color:'#d8b565',description:"O encéfalo, a medula espinal e os nervos recebem, processam e transmitem sinais. Participam da sensibilidade, do movimento, da coordenação e do controle automático das funções do corpo."},
 {id:'respiratory',name:"Respiratório",color:'#b98991',description:"As vias respiratórias conduzem o ar aos pulmões, onde ocorrem as trocas de oxigênio e gás carbônico entre o ar e o sangue. Os músculos respiratórios permitem a entrada e a saída do ar."},
 {id:'digestive',name:"Digestório",color:'#b8916b',description:"O sistema digestório transforma os alimentos, absorve nutrientes e água e conduz os resíduos até sua eliminação. Órgãos associados produzem bile e enzimas que ajudam na digestão."},
 {id:'urinary',name:"Urinário",color:'#b47961',description:"Os rins filtram o sangue e regulam a quantidade de água, sais e a acidez do organismo. A urina segue pelos ureteres até a bexiga e sai do corpo pela uretra."},
 {id:'lymphatic',name:"Linfático",color:'#879f7c',description:"Os vasos linfáticos devolvem à circulação o excesso de líquido dos tecidos. Os linfonodos e outros órgãos linfoides participam da defesa do organismo."},
 {id:'endocrine',name:"Endócrino",color:'#c5a09a',description:"As glândulas endócrinas liberam hormônios no sangue. Esses mensageiros regulam processos como metabolismo, crescimento, resposta ao estresse e reprodução."},
 {id:'reproductive',name:"Reprodutor",color:'#bda098',description:"As estruturas reprodutoras masculinas deste modelo participam da produção, maturação e transporte dos espermatozoides, além da produção de hormônios sexuais."},
 {id:'integumentary',name:"Superfície corporal",color:'#ba9b7d',description:"A superfície do corpo serve de referência para localizar as estruturas. O sistema tegumentar forma uma barreira de proteção, participa da sensibilidade e ajuda a regular a temperatura."},
 {id:'connective',name:"Tecido conjuntivo",color:'#aec3bb',description:"Cartilagens, ligamentos e outros tecidos conjuntivos sustentam, unem e separam estruturas. Ajudam a estabilizar articulações e a distribuir as forças que atuam sobre o corpo."},
];
export interface Part {id:string;name:string;conceptId:string;system:SystemId;chunk:number;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface Concept {id:string;name:string;elements:string[]}
export interface Atlas {version:string;sex?:'male';source?:string;scope?:string;parts:Part[];concepts:Concept[];chunks:{url:string;bytes:number;gzip?:string;gzipBytes?:number}[];triangles:number}
export type View = 'three-quarter'|'front'|'back'|'side';
export interface SceneState {inspectorOpen?:boolean;explode:number;visible:SystemId[];selected:string[];isolate:boolean;view:View;rotate:boolean;reset:number}
export const DEFAULT_VISIBLE:SystemId[] = ['cardiac','sensory','skeletal','muscular','arterial','venous','nervous','respiratory','digestive','urinary','lymphatic','endocrine','reproductive','connective'];
export const EXPLANATIONS:Record<string,string> = {
  "heart": "Órgão muscular localizado no tórax. O lado direito envia sangue aos pulmões; o lado esquerdo envia sangue ao restante do corpo.",
  "liver": "Órgão situado principalmente na parte superior direita do abdome. Processa nutrientes absorvidos, produz bile e sintetiza proteínas importantes do sangue.",
  "brain": "O encéfalo é a parte do sistema nervoso localizada dentro do crânio. Inclui o cérebro, o cerebelo e o tronco encefálico. Participa da percepção, do movimento, da memória, da linguagem e da regulação das funções do corpo.",
  "stomach": "Órgão muscular entre o esôfago e o intestino delgado. Armazena e mistura o alimento com ácido e enzimas antes de encaminhá-lo ao duodeno.",
  "spleen": "Órgão linfoide na parte superior esquerda do abdome. Filtra o sangue, remove células sanguíneas envelhecidas e participa da defesa imunológica.",
  "pancreas": "Órgão abdominal com funções digestivas e hormonais. Fornece enzimas ao intestino delgado e libera hormônios como insulina e glucagon, que ajudam a regular a glicose no sangue.",
  "urinary bladder": "Reservatório muscular na pelve. Armazena a urina que chega dos rins pelos ureteres até o momento de sua eliminação.",
  "trachea": "Via respiratória que liga a laringe aos brônquios. Suas cartilagens ajudam a manter a passagem do ar aberta.",
  "diaphragm": "Músculo que separa o tórax do abdome. Ao se contrair, aumenta o espaço dentro do tórax e favorece a entrada de ar nos pulmões.",
  "kidney": "Órgão que filtra o sangue e produz urina. Ajuda a regular água, sais e acidez do organismo, além de participar do controle da pressão arterial e da produção de células vermelhas do sangue.",
  "lung": "Órgão respiratório onde ocorrem as trocas gasosas. Nos alvéolos, o oxigênio passa do ar para o sangue e o gás carbônico faz o caminho inverso.",
  "esophagus": "Tubo muscular que conduz o alimento da faringe ao estômago por movimentos coordenados chamados peristaltismo.",
  "gallbladder": "Pequeno órgão sob o fígado que armazena e concentra a bile. A bile é liberada no intestino e ajuda na digestão das gorduras.",
  "duodenum": "Primeira parte do intestino delgado. Recebe o conteúdo do estômago, a bile e as secreções pancreáticas para continuar a digestão.",
  "jejunum": "Parte intermediária do intestino delgado, importante para a absorção dos nutrientes resultantes da digestão.",
  "ileum": "Parte final do intestino delgado. Participa da absorção de nutrientes, incluindo vitamina B12 e sais biliares.",
  "small intestine": "Trecho formado por duodeno, jejuno e íleo. É o principal local de digestão e absorção de nutrientes.",
  "large intestine": "Trecho final do tubo digestório. Absorve água e eletrólitos e participa da formação e do transporte das fezes.",
  "colon": "Parte do intestino grosso que absorve água e eletrólitos e conduz o conteúdo intestinal em direção ao reto.",
  "rectum": "Porção final do intestino grosso, onde as fezes ficam armazenadas antes da evacuação.",
  "cecum": "Parte inicial do intestino grosso, que recebe o conteúdo do íleo. O apêndice se liga a essa região.",
  "appendix": "Pequena estrutura tubular ligada ao ceco. Contém tecido linfoide associado à defesa do organismo.",
  "ureter": "Tubo muscular que leva a urina de cada rim até a bexiga.",
  "urethra": "Canal que conduz a urina da bexiga ao exterior. No corpo masculino, também participa da passagem do sêmen.",
  "testis": "Órgão reprodutor masculino que produz espermatozoides e hormônios, principalmente testosterona.",
  "epididymis": "Estrutura junto ao testículo onde os espermatozoides amadurecem e ficam armazenados antes de seguir pelo ducto deferente.",
  "prostate": "Glândula abaixo da bexiga que envolve parte da uretra masculina. Produz uma secreção que compõe o sêmen.",
  "adrenal gland": "Glândula localizada sobre o rim. Produz hormônios envolvidos no metabolismo, no equilíbrio de sais e na resposta ao estresse.",
  "pituitary gland": "Glândula na base do encéfalo, também chamada hipófise. Seus hormônios participam do crescimento, da reprodução e da regulação de outras glândulas.",
  "thyroid gland": "Glândula na região anterior do pescoço. Produz hormônios que regulam o metabolismo e participam do crescimento e do desenvolvimento.",
  "thymus": "Órgão linfoide situado no tórax, especialmente ativo na infância. Participa da maturação de linfócitos T, células de defesa.",
  "skin": "Revestimento externo do corpo. Protege os tecidos, ajuda a evitar perda de água e participa da sensibilidade e da regulação da temperatura.",
  "spinal cord": "Parte do sistema nervoso central situada no canal vertebral. Transmite sinais entre o encéfalo e o corpo e participa de reflexos.",
  "cerebellum": "Parte do encéfalo que ajuda a coordenar movimentos, manter o equilíbrio e ajustar a postura.",
  "brainstem": "Região que conecta o encéfalo à medula espinal. Participa de funções automáticas, como respiração, e da passagem de sinais nervosos.",
  "aorta": "Maior artéria do corpo. Sai do ventrículo esquerdo do coração e distribui sangue para a circulação sistêmica.",
  "femur": "Osso da coxa, entre o quadril e o joelho. Sustenta o peso corporal e serve de apoio para músculos envolvidos na locomoção.",
  "patella": "Osso situado na parte anterior do joelho, também chamado rótula. Protege a articulação e contribui para a ação do músculo quadríceps.",
  "tibia": "Osso medial da perna, entre o joelho e o tornozelo. É o principal osso de sustentação de peso nessa região.",
  "fibula": "Osso lateral da perna. Serve de fixação para músculos e participa da estabilidade do tornozelo.",
  "humerus": "Osso do braço, entre o ombro e o cotovelo. Participa das articulações e dos movimentos dessa região.",
  "radius": "Osso do antebraço localizado do lado do polegar na posição anatômica. Participa dos movimentos do antebraço e da articulação do punho.",
  "ulna": "Osso do antebraço localizado do lado do dedo mínimo na posição anatômica. Tem papel importante na articulação do cotovelo.",
  "clavicle": "Osso que liga o esterno à escápula. Ajuda a sustentar o ombro e a transmitir forças do membro superior ao tronco.",
  "scapula": "Osso plano na região posterior do ombro. Articula-se com o úmero e a clavícula e oferece inserção para vários músculos.",
  "eyeball": "Estrutura do olho que abriga tecidos responsáveis por captar a luz e iniciar a formação da informação visual.",
  "lens": "Estrutura transparente do olho, chamada cristalino. Ajusta o foco da luz sobre a retina.",
  "retina": "Camada sensível à luz no interior do olho. Converte estímulos luminosos em sinais nervosos.",
  "cornea": "Parte transparente da frente do olho. Protege o olho e participa da focalização da luz.",
  "larynx": "Estrutura do pescoço que participa da passagem do ar, da produção da voz e da proteção das vias respiratórias durante a deglutição.",
  "tongue": "Órgão muscular da boca que participa da movimentação dos alimentos, da deglutição, da fala e da percepção dos sabores."
};

export function specificExplanation(name:string){
 const key=name.toLowerCase().replace(/^(right|left) /,'');
 return EXPLANATIONS[key];
}
export function explanation(name:string,system:SystemId){return specificExplanation(name) ?? SYSTEMS.find(s=>s.id===system)?.description ?? '';}

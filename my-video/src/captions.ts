export type SubLine = {
  fromFrame: number;
  toFrame: number;
  text: string;
};

export const SUBTITLES: SubLine[] = [
  { fromFrame: 0, toFrame: 90, text: "Ces arnaques te ciblent en ce moment." },
  {
    fromFrame: 90,
    toFrame: 270,
    text: "Le phishing : un mail imite ta banque pour voler ton mot de passe.",
  },
  {
    fromFrame: 270,
    toFrame: 450,
    text: "Le faux support technique : « votre PC est infecté ».",
  },
  {
    fromFrame: 450,
    toFrame: 630,
    text: "L'arnaque sentimentale : un profil parfait qui finit par demander de l'argent.",
  },
  {
    fromFrame: 630,
    toFrame: 810,
    text: "Les faux placements : rendements garantis, piège garanti.",
  },
  { fromFrame: 810, toFrame: 930, text: "Les signaux d'alerte." },
  {
    fromFrame: 930,
    toFrame: 1080,
    text: "Urgence, chantage, offres trop belles pour être vraies.",
  },
  {
    fromFrame: 1080,
    toFrame: 1200,
    text: "Adresses bizarres, liens raccourcis.",
  },
  { fromFrame: 1200, toFrame: 1320, text: "Comment te protéger ?" },
  {
    fromFrame: 1320,
    toFrame: 1470,
    text: "Vérifie l'expéditeur, jamais par le lien reçu.",
  },
  {
    fromFrame: 1470,
    toFrame: 1590,
    text: "Active la double authentification partout.",
  },
  {
    fromFrame: 1590,
    toFrame: 1680,
    text: "Ne partage jamais tes codes.",
  },
  {
    fromFrame: 1680,
    toFrame: 1800,
    text: "Toi, la pire arnaque que tu as vue ? Like si t'as appris un truc !",
  },
];

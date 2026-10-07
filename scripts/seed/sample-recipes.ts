import type { RecipeProfileAnswers } from "@shared/recipe-profile";
import type { RecipeSection } from "@shared/recipes";

// Sample recipes for trying the app, ported from the cookbase seed.
export type SampleRecipe = {
  title: string;
  description: string;
  servings: number | null;
  // Left out for some, as recipes without a photo.
  imageUrl?: string;
  createdAt: string;
  tags: readonly string[];
  // What a model would have read from the recipe for meal suggestions.
  profile: RecipeProfileAnswers;
  ingredients: readonly RecipeSection[];
  instructions: readonly RecipeSection[];
};

export const sampleRecipes: readonly SampleRecipe[] = [
  {
    title: "Lasagne med soltorkade tomater",
    description:
      "En fyllig och värmande lasagne med soltorkade tomater, krämig béchamelsås och rikligt med parmesan.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/31581242/pexels-photo-31581242.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-03-14T18:30:00.000Z",
    tags: ["Italian", "Dairy", "Pasta", "Involved"],
    profile: {
      isDinner: true,
      base: "pasta",
      protein: "vegetarian",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        heading: "Tomatsås",
        items: [
          "2 msk olivolja",
          "1 gul lök, finhackad",
          "3 vitlöksklyftor, finhackade",
          "150 g soltorkade tomater",
          "2 x 400 g krossade tomater",
          "1 tsk torkad oregano",
        ],
      },
      {
        heading: "Béchamelsås",
        items: ["50 g smör", "4 msk vetemjöl", "5 dl mjölk", "1 krm riven muskot"],
      },
      {
        heading: "Montering",
        items: ["12 lasagneplattor", "100 g finriven parmesan", "Färsk basilika till servering"],
      },
    ],
    instructions: [
      {
        heading: "Tomatsås",
        items: [
          "Värm olivoljan i en stor kastrull på medelvärme.",
          "Tillsätt lök och stek i 5–6 minuter tills den är mjuk och genomskinlig.",
          "Rör ner vitlök, soltorkade tomater, krossade tomater och oregano. Låt sjuda utan lock i 20 minuter.",
          "Smaka av med salt och nymalen svartpeppar.",
        ],
      },
      {
        heading: "Béchamelsås",
        items: [
          "Smält smöret i en kastrull. Vispa ner mjölet och låt fräsa i en minut.",
          "Tillsätt mjölken lite i taget under vispning. Sjud tills såsen har tjocknat och krydda med muskot.",
        ],
      },
      {
        heading: "Montering",
        items: [
          "Varva tomatsås, lasagneplattor och béchamelsås i en ugnsform. Avsluta med béchamel och parmesan.",
          "Grädda mitt i ugnen på 200 °C i 30–35 minuter, tills ytan är gyllene.",
          "Låt lasagnen vila i 10 minuter före servering och toppa med färsk basilika.",
        ],
      },
    ],
  },
  {
    title: "Pasta carbonara",
    description:
      "Den klassiska romerska carbonaran: ägg, pecorino, guanciale och svartpeppar. Inget annat.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-03-21T17:05:00.000Z",
    tags: ["Italian", "Pork", "Egg", "Pasta"],
    profile: { isDinner: true, base: "pasta", protein: "pork", effort: "quick", isTreat: false },
    ingredients: [
      {
        items: [
          "400 g spaghetti",
          "150 g guanciale eller sidfläsk, tärnat",
          "4 äggulor",
          "1 ägg",
          "100 g pecorino, finriven",
          "Nymalen svartpeppar",
          "Salt till pastavattnet",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Koka spaghettin i rikligt med saltat vatten enligt anvisningen på paketet.",
          "Stek guancialen knaprig i en torr panna på medelvärme. Ta pannan från värmen.",
          "Vispa ihop äggulor, ägg, pecorino och rikligt med svartpeppar i en skål.",
          "Häll av pastan men spara 1 dl av kokvattnet. Vänd ner pastan i pannan med fläsket.",
          "Rör ner äggblandningen och lite kokvatten tills såsen blir krämig. Servera direkt med mer pecorino.",
        ],
      },
    ],
  },
  {
    title: "Köttbullar med gräddsås",
    description:
      "Saftiga köttbullar med brun gräddsås, potatispuré och rårörda lingon. Söndagsmiddag på riktigt.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/17989471/pexels-photo-17989471.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-04-02T16:45:00.000Z",
    tags: ["Swedish", "Beef", "Pork", "Potato", "Involved"],
    profile: {
      isDinner: true,
      base: "potato",
      protein: "beef",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        heading: "Köttbullar",
        items: [
          "500 g blandfärs",
          "1 gul lök, finhackad",
          "1 dl ströbröd",
          "1½ dl mjölk",
          "1 ägg",
          "1 tsk salt",
          "2 krm svartpeppar",
          "2 krm kryddpeppar",
          "Smör till stekning",
        ],
      },
      {
        heading: "Gräddsås",
        items: [
          "2 msk vetemjöl",
          "3 dl grädde",
          "2 dl vatten",
          "1 msk kalvfond",
          "1 msk soja",
          "Salt och peppar",
        ],
      },
      {
        heading: "Till servering",
        items: ["Potatispuré", "Rårörda lingon", "Pressgurka"],
      },
    ],
    instructions: [
      {
        heading: "Köttbullar",
        items: [
          "Blanda ströbröd och mjölk i en skål och låt svälla i 10 minuter.",
          "Fräs löken mjuk i lite smör. Blanda färs, lök, ströbrödsblandning, ägg och kryddor till en smet.",
          "Rulla små bullar med fuktade händer och stek dem i smör på medelvärme tills de är genomstekta.",
        ],
      },
      {
        heading: "Gräddsås",
        items: [
          "Pudra mjölet i stekpannan där köttbullarna stekts och rör om.",
          "Tillsätt grädde, vatten, fond och soja under vispning. Sjud i 5 minuter och smaka av.",
          "Servera köttbullarna med såsen, potatispurén, lingon och pressgurka.",
        ],
      },
    ],
  },
  {
    title: "Raggmunk med fläsk",
    description:
      "Krispiga raggmunkar stekta i smör, serverade med stekt rimmat sidfläsk och lingon.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/35017893/pexels-photo-35017893.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-04-11T17:20:00.000Z",
    tags: ["Swedish", "Pork", "Potato"],
    profile: { isDinner: true, base: "potato", protein: "pork", effort: "normal", isTreat: false },
    ingredients: [
      {
        heading: "Smet",
        items: [
          "2,5 dl vetemjöl",
          "5 dl mjölk",
          "2 ägg",
          "1 tsk salt",
          "1 kg fast potatis",
          "Smör till stekning",
        ],
      },
      {
        heading: "Tillbehör",
        items: ["400 g rimmat sidfläsk, skivat", "Rårörda lingon"],
      },
    ],
    instructions: [
      {
        items: [
          "Vispa ihop mjöl, hälften av mjölken, ägg och salt till en slät smet. Vispa i resten av mjölken.",
          "Skala och riv potatisen grovt. Vänd ner den i smeten direkt så den inte mörknar.",
          "Stek fläsket knaprigt i en torr panna och håll det varmt.",
          "Stek tunna raggmunkar i rikligt med smör på medelhög värme, cirka 3 minuter per sida.",
          "Servera raggmunkarna direkt med fläsk och lingon.",
        ],
      },
    ],
  },
  {
    title: "Ugnsbakad lax med dill",
    description:
      "Lax som bakas skonsamt i ugnen med citron och dill. Klar på en halvtimme och nästan omöjlig att misslyckas med.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/14515086/pexels-photo-14515086.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-04-23T18:00:00.000Z",
    tags: ["Nordic", "Fish", "Quick"],
    profile: { isDinner: true, base: "potato", protein: "fish", effort: "quick", isTreat: false },
    ingredients: [
      {
        items: [
          "600 g laxfilé i portionsbitar",
          "1 citron",
          "1 kruka dill",
          "2 msk olivolja",
          "1 tsk salt",
          "2 krm svartpeppar",
        ],
      },
      {
        heading: "Dillsås",
        items: ["2 dl crème fraiche", "2 msk hackad dill", "1 msk citronsaft", "Salt efter smak"],
      },
    ],
    instructions: [
      {
        items: [
          "Sätt ugnen på 175 °C.",
          "Lägg laxen i en smord ugnsform. Ringla över olivolja, salta och peppra.",
          "Skiva citronen tunt och lägg skivorna på laxen tillsammans med några dillkvistar.",
          "Baka mitt i ugnen i 15–18 minuter tills laxen precis har blivit ogenomskinlig i mitten.",
          "Blanda crème fraiche, dill och citronsaft till en sås och smaka av med salt. Servera med kokt potatis.",
        ],
      },
    ],
  },
  {
    title: "Kycklinggryta med curry",
    description:
      "Mild och krämig kycklinggryta med curry, äpple och kokosmjölk som hela familjen gillar.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/7353487/pexels-photo-7353487.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-05-05T17:30:00.000Z",
    tags: ["Fusion", "Chicken", "Rice"],
    profile: { isDinner: true, base: "rice", protein: "chicken", effort: "normal", isTreat: false },
    ingredients: [
      {
        items: [
          "600 g kycklinglårfilé, i bitar",
          "1 gul lök, hackad",
          "2 vitlöksklyftor, finhackade",
          "1 äpple, tärnat",
          "2 msk gul curry",
          "1 burk kokosmjölk à 400 ml",
          "2 dl kycklingbuljong",
          "1 msk rapsolja",
          "Salt och peppar",
          "Färsk koriander till servering",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Bryn kycklingen i olja i en stor gryta. Salta och peppra.",
          "Tillsätt lök, vitlök och äpple och fräs i några minuter.",
          "Rör ner curryn och låt den fräsa med i en halv minut.",
          "Häll på kokosmjölk och buljong. Låt sjuda under lock i 20 minuter.",
          "Smaka av och servera med ris och färsk koriander.",
        ],
      },
    ],
  },
  {
    title: "Krämig tomatsoppa",
    description:
      "Len tomatsoppa på ugnsrostade tomater med en skvätt grädde. Servera med rostat bröd.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/3296683/pexels-photo-3296683.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-05-14T12:10:00.000Z",
    tags: ["Lunch", "Bread"],
    profile: {
      isDinner: true,
      base: "bread",
      protein: "vegetarian",
      effort: "normal",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "1 kg mogna tomater, delade",
          "1 gul lök, klyftad",
          "3 vitlöksklyftor",
          "3 msk olivolja",
          "1 burk krossade tomater à 400 g",
          "5 dl grönsaksbuljong",
          "1 dl grädde",
          "1 tsk socker",
          "Salt och nymalen svartpeppar",
          "Färsk basilika",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Sätt ugnen på 200 °C. Lägg tomater, lök och vitlök på en plåt, ringla över olja och rosta i 30 minuter.",
          "Lägg det rostade i en kastrull med krossade tomater och buljong. Koka upp och sjud i 10 minuter.",
          "Mixa soppan slät med en stavmixer. Rör ner grädde och socker.",
          "Smaka av med salt och peppar. Toppa med basilika och servera med rostat bröd.",
        ],
      },
    ],
  },
  {
    title: "Pannkakor",
    description: "Tunna svenska pannkakor som blir lika bra till frukost som till torsdagsmiddag.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/754959/pexels-photo-754959.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-05-22T08:15:00.000Z",
    tags: ["Breakfast", "Swedish", "Egg", "Dairy"],
    profile: {
      isDinner: true,
      base: "other",
      protein: "vegetarian",
      effort: "quick",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "2 1/2 dl vetemjöl",
          "½ tsk salt",
          "6 dl mjölk",
          "3 ägg",
          "2 msk smält smör",
          "Smör till stekning",
        ],
      },
      {
        heading: "Till servering",
        items: ["Sylt", "Vispad grädde eller glass"],
      },
    ],
    instructions: [
      {
        items: [
          "Blanda mjöl och salt i en bunke. Vispa i hälften av mjölken till en slät smet.",
          "Vispa i resten av mjölken, äggen och det smälta smöret. Låt smeten svälla i 15 minuter.",
          "Hetta upp en stekpanna med lite smör. Häll i en tunn omgång smet och stek gyllene på båda sidor.",
          "Servera pannkakorna varma med sylt och grädde.",
        ],
      },
    ],
  },
  {
    title: "Tacos med rostad majs",
    description: "Fredagstacos med kryddig färs, rostad majs och en snabb picklad rödlök.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/15434316/pexels-photo-15434316.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-05-30T17:40:00.000Z",
    tags: ["Mexican", "Beef", "Tortilla"],
    profile: { isDinner: true, base: "other", protein: "beef", effort: "normal", isTreat: true },
    ingredients: [
      {
        heading: "Färs",
        items: [
          "500 g nötfärs",
          "1 gul lök, hackad",
          "2 msk tacokrydda",
          "1 dl vatten",
          "1 msk rapsolja",
        ],
      },
      {
        heading: "Rostad majs",
        items: ["1 burk majs à 340 g, avrunnen", "1 msk smör", "1 lime", "Salt"],
      },
      {
        heading: "Picklad rödlök",
        items: [
          "1 rödlök, tunt skivad",
          "1 dl vatten",
          "½ dl vitvinsvinäger",
          "1 msk socker",
          "1 tsk salt",
        ],
      },
      {
        heading: "Till servering",
        items: ["12 små tortillas", "Gräddfil", "Riven ost", "Koriander"],
      },
    ],
    instructions: [
      {
        items: [
          "Koka upp vatten, vinäger, socker och salt till rödlöken. Lägg i löken och låt stå medan resten görs.",
          "Rosta majsen i smör i en het panna tills den får färg. Pressa över lime och salta.",
          "Bryn färsen med lök i olja. Tillsätt tacokrydda och vatten och låt sjuda ihop i 5 minuter.",
          "Värm tortillas och låt alla bygga sina egna tacos.",
        ],
      },
    ],
  },
  {
    title: "Halloumistroganoff",
    description:
      "Vegetarisk stroganoff med stekt halloumi i en krämig tomatsås. Klar på 25 minuter.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-06-04T17:55:00.000Z",
    tags: ["Dairy", "Rice", "Quick"],
    profile: {
      isDinner: true,
      base: "rice",
      protein: "vegetarian",
      effort: "quick",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "2 paket halloumi à 200 g",
          "1 gul lök, hackad",
          "1 röd paprika, strimlad",
          "2 msk tomatpuré",
          "1 burk krossade tomater à 400 g",
          "2 dl grädde",
          "1 tsk paprikapulver",
          "1 msk olivolja",
          "Salt och peppar",
          "Persilja till servering",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Skär halloumin i stavar och stek den gyllene i olja. Lägg åt sidan.",
          "Fräs lök och paprika i samma panna. Rör ner tomatpuré och paprikapulver.",
          "Tillsätt krossade tomater och grädde och låt sjuda i 10 minuter.",
          "Vänd ner halloumin, smaka av och servera med ris och hackad persilja.",
        ],
      },
    ],
  },
  {
    title: "Fiskgratäng med potatismos",
    description:
      "Klassisk fiskgratäng med dill, räkor och ett täcke av potatismos som gratineras gyllene.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-06-12T17:25:00.000Z",
    tags: ["Swedish", "Fish", "Shellfish", "Potato", "Involved"],
    profile: {
      isDinner: true,
      base: "potato",
      protein: "fish",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        heading: "Gratäng",
        items: [
          "600 g vit fisk, till exempel torsk eller sej",
          "200 g räkor, skalade",
          "2 msk smör",
          "2 msk vetemjöl",
          "3 dl mjölk",
          "1 dl grädde",
          "1 dl hackad dill",
          "1 msk citronsaft",
          "Salt och vitpeppar",
        ],
      },
      {
        heading: "Potatismos",
        items: ["1 kg mjölig potatis", "1½ dl mjölk", "50 g smör", "Salt", "1 äggula"],
      },
    ],
    instructions: [
      {
        heading: "Potatismos",
        items: [
          "Skala och koka potatisen mjuk. Pressa eller mosa den och rör ner mjölk, smör, salt och äggula.",
        ],
      },
      {
        heading: "Gratäng",
        items: [
          "Sätt ugnen på 225 °C. Smält smör, vispa i mjöl och späd med mjölk och grädde till en sås. Sjud i 5 minuter.",
          "Rör ner dill och citronsaft i såsen och smaka av med salt och vitpeppar.",
          "Lägg fisken i bitar och räkorna i en smord form. Häll över såsen och bred moset ovanpå.",
          "Gratinera i 25 minuter tills moset fått fin färg.",
        ],
      },
    ],
  },
  {
    title: "Chili con carne",
    description:
      "Mustig chili con carne som blir bättre dagen efter. Perfekt att laga i stor sats och frysa in.",
    servings: 8,
    imageUrl:
      "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-06-20T16:10:00.000Z",
    tags: ["American", "Beef", "Legumes", "Rice"],
    profile: { isDinner: true, base: "rice", protein: "beef", effort: "involved", isTreat: false },
    ingredients: [
      {
        items: [
          "1 kg nötfärs",
          "2 gula lökar, hackade",
          "4 vitlöksklyftor, finhackade",
          "2 röda paprikor, tärnade",
          "2 x 400 g krossade tomater",
          "2 burkar kidneybönor à 400 g, avrunna",
          "2 msk tomatpuré",
          "2 msk spiskummin",
          "1 msk rökt paprikapulver",
          "1–2 tsk chiliflakes",
          "2 msk rapsolja",
          "Salt och peppar",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Bryn färsen i omgångar i olja i en stor gryta. Salta och peppra.",
          "Tillsätt lök, vitlök och paprika och fräs i 5 minuter.",
          "Rör ner tomatpuré och kryddor. Häll på krossade tomater och låt sjuda under lock i 45 minuter.",
          "Tillsätt bönorna och sjud ytterligare 15 minuter. Smaka av och servera med ris, gräddfil och nachochips.",
        ],
      },
    ],
  },
  {
    title: "Krämig svamprisotto",
    description:
      "Risotto på arborioris med stekt svamp, parmesan och timjan. Kräver lite tålamod men belönar rikligt.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/2629780/pexels-photo-2629780.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-07-01T18:20:00.000Z",
    tags: ["Italian", "Dairy", "Rice", "Involved"],
    profile: {
      isDinner: true,
      base: "rice",
      protein: "vegetarian",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "3,5 dl arborioris",
          "400 g blandad svamp, skivad",
          "1 gul lök, finhackad",
          "2 vitlöksklyftor, finhackade",
          "1½ dl torrt vitt vin",
          "ca 1 liter varm grönsaksbuljong",
          "100 g parmesan, riven",
          "50 g smör",
          "2 msk olivolja",
          "1 msk färsk timjan",
          "Salt och peppar",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Stek svampen i olivolja på hög värme tills den fått färg. Salta och lägg åt sidan.",
          "Fräs lök och vitlök i hälften av smöret. Tillsätt riset och rör i en minut.",
          "Häll på vinet och låt det koka in. Tillsätt sedan buljong, en slev i taget, under omrörning tills riset är krämigt men har tuggmotstånd, cirka 18 minuter.",
          "Rör ner svamp, parmesan, resten av smöret och timjan. Smaka av och servera direkt.",
        ],
      },
    ],
  },
  {
    title: "Köttfärssås med spaghetti",
    description:
      "Vardagens mest pålitliga middag: en långkokt köttfärssås med morot och rotselleri.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/16845657/pexels-photo-16845657.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-07-09T17:00:00.000Z",
    tags: ["Italian", "Beef", "Pork", "Pasta", "Involved"],
    profile: { isDinner: true, base: "pasta", protein: "beef", effort: "normal", isTreat: false },
    ingredients: [
      {
        items: [
          "500 g blandfärs",
          "1 gul lök, finhackad",
          "2–3 morötter, finrivna",
          "1 bit rotselleri, finriven",
          "2 vitlöksklyftor",
          "2 msk tomatpuré",
          "1 burk krossade tomater à 400 g",
          "1 dl mjölk",
          "1 tsk torkad oregano",
          "2 msk olivolja",
          "Salt och peppar",
          "400 g spaghetti",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Bryn färsen i olja i en stor kastrull. Tillsätt lök, morot, rotselleri och vitlök och fräs i 5 minuter.",
          "Rör ner tomatpuré och oregano. Häll på krossade tomater och mjölk.",
          "Låt såsen puttra på svag värme i minst 30 minuter. Smaka av med salt och peppar.",
          "Koka spaghettin och servera med såsen och riven parmesan.",
        ],
      },
    ],
  },
  {
    title: "Äppelpaj med havrecrunch",
    description:
      "Höstens äppelpaj med kanel och ett knaprigt havretäcke. Servera ljummen med vaniljsås.",
    servings: 8,
    imageUrl:
      "https://images.pexels.com/photos/14892628/pexels-photo-14892628.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-09-06T14:30:00.000Z",
    tags: ["Fika", "Dessert", "Baking", "Swedish", "Oats"],
    profile: {
      isDinner: false,
      base: "other",
      protein: "vegetarian",
      effort: "normal",
      isTreat: false,
    },
    ingredients: [
      {
        heading: "Fyllning",
        items: ["6 syrliga äpplen", "2 msk socker", "2 tsk kanel", "1 msk citronsaft"],
      },
      {
        heading: "Havrecrunch",
        items: ["150 g smör", "2 dl havregryn", "1½ dl vetemjöl", "1 dl socker", "1 krm salt"],
      },
    ],
    instructions: [
      {
        items: [
          "Sätt ugnen på 200 °C. Skala och skiva äpplena och blanda dem med socker, kanel och citronsaft i en smord pajform.",
          "Nyp ihop smör, havregryn, mjöl, socker och salt till ett grynigt smul.",
          "Fördela smulet över äpplena och grädda i 30 minuter tills täcket är gyllene.",
          "Servera ljummen med vaniljsås eller glass.",
        ],
      },
    ],
  },
  {
    title: "Mormors kanelbullar",
    description:
      "Mjuka kanelbullar med kardemumma i degen och rikligt med fyllning, precis som mormor bakade dem.",
    servings: 24,
    imageUrl:
      "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-09-20T10:00:00.000Z",
    tags: ["Fika", "Dessert", "Baking", "Swedish", "Bread", "Involved"],
    profile: {
      isDinner: false,
      base: "bread",
      protein: "vegetarian",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        heading: "Deg",
        items: [
          "50 g jäst",
          "5 dl mjölk",
          "150 g smör",
          "1 dl socker",
          "1 tsk salt",
          "1 msk stött kardemumma",
          "ca 14 dl vetemjöl",
        ],
      },
      {
        heading: "Fyllning",
        items: ["150 g rumsvarmt smör", "1 dl socker", "2 msk kanel"],
      },
      {
        heading: "Pensling",
        items: ["1 ägg", "Pärlsocker"],
      },
    ],
    instructions: [
      {
        heading: "Deg",
        items: [
          "Smält smöret och häll i mjölken. Värm till fingervarmt, 37 °C.",
          "Lös jästen i degspadet. Tillsätt socker, salt, kardemumma och det mesta av mjölet. Arbeta degen smidig.",
          "Låt degen jäsa under bakduk i 40 minuter.",
        ],
      },
      {
        heading: "Bullar",
        items: [
          "Kavla ut degen till en rektangel. Bred på smör och strö över socker och kanel.",
          "Rulla ihop från långsidan och skär i 24 bitar. Lägg i bullformar och låt jäsa i 30 minuter.",
          "Pensla med ägg, strö på pärlsocker och grädda i 225 °C i 8–10 minuter.",
        ],
      },
    ],
  },
  {
    title: "Enkelt surdegsbröd",
    description:
      "Ett förlåtande surdegsbröd utan knådning. Sätt degen på kvällen och baka på morgonen.",
    servings: null,
    imageUrl:
      "https://images.pexels.com/photos/4050487/pexels-photo-4050487.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-08-03T07:45:00.000Z",
    tags: ["Breakfast", "Baking", "Bread", "Involved"],
    profile: {
      isDinner: false,
      base: "bread",
      protein: "vegetarian",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        items: ["1 dl aktiv surdegsgrund", "4 dl vatten", "500 g vetemjöl special", "2 tsk salt"],
      },
    ],
    instructions: [
      {
        items: [
          "Blanda surdegsgrund och vatten. Rör ner mjöl och salt till en kladdig deg.",
          "Vik degen i skålen fyra gånger med 30 minuters mellanrum. Täck och låt stå i rumstemperatur över natten.",
          "Forma degen till en boll och lägg i en mjölad jäskorg. Låt jäsa i 2 timmar.",
          "Värm ugnen med en gjutjärnsgryta till 250 °C. Lägg brödet i grytan, snitta och grädda under lock i 25 minuter, sedan utan lock i 20 minuter.",
        ],
      },
    ],
  },
  {
    title: "Korv stroganoff",
    description:
      "Snabb och barnvänlig korv stroganoff med krämig tomatsås. Ett säkert kort i veckan.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/16201174/pexels-photo-16201174.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-08-19T17:15:00.000Z",
    tags: ["Swedish", "Pork", "Rice", "Quick"],
    profile: { isDinner: true, base: "rice", protein: "pork", effort: "quick", isTreat: false },
    ingredients: [
      {
        items: [
          "800 g falukorv",
          "1 gul lök, hackad",
          "2 msk tomatpuré",
          "2 dl grädde",
          "2 dl crème fraiche",
          "1 msk senap",
          "1 msk smör",
          "Salt och peppar",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Skär korven i strimlor och bryn den i smör tillsammans med löken.",
          "Rör ner tomatpurén och låt den fräsa med en stund.",
          "Tillsätt grädde, crème fraiche och senap. Låt sjuda i 10 minuter.",
          "Smaka av med salt och peppar och servera med ris.",
        ],
      },
    ],
  },
  {
    title: "Potatis- och purjolökssoppa",
    description:
      "Mild och krämig soppa på potatis och purjolök, toppad med knaprigt bröd och gräslök.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/3296683/pexels-photo-3296683.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-10-02T12:00:00.000Z",
    tags: ["Lunch", "French", "Potato"],
    profile: {
      isDinner: true,
      base: "potato",
      protein: "vegetarian",
      effort: "normal",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "700 g potatis, tärnad",
          "2 purjolökar, skivade",
          "1 gul lök, hackad",
          "2 msk smör",
          "8 dl grönsaksbuljong",
          "1 dl grädde",
          "Salt och vitpeppar",
          "Gräslök till servering",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Fräs purjolök och lök mjuka i smöret utan att de får färg.",
          "Tillsätt potatis och buljong. Koka tills potatisen är mjuk, cirka 15 minuter.",
          "Mixa soppan slät och rör ner grädden. Smaka av med salt och vitpeppar.",
          "Servera med rostat bröd och hackad gräslök.",
        ],
      },
    ],
  },
  {
    title: "Citronkyckling med rostad potatis",
    description:
      "Hel kyckling som ugnsrostas med citron, vitlök och timjan på en bädd av potatis. Helgens enklaste festmåltid.",
    servings: 4,
    imageUrl:
      "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=800",
    createdAt: "2025-10-11T16:30:00.000Z",
    tags: ["Mediterranean", "Chicken", "Potato", "Involved"],
    profile: {
      isDinner: true,
      base: "potato",
      protein: "chicken",
      effort: "involved",
      isTreat: false,
    },
    ingredients: [
      {
        items: [
          "1 hel kyckling, ca 1,4 kg",
          "1 kg fast potatis, i klyftor",
          "2 citroner",
          "1 hel vitlök, delad",
          "1 knippe timjan",
          "3 msk olivolja",
          "50 g smör, rumsvarmt",
          "Salt och nymalen svartpeppar",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Sätt ugnen på 200 °C. Vänd potatisklyftorna i olivolja, salt och peppar och lägg dem i en stor ugnsform.",
          "Gnid in kycklingen med smör, salt och peppar. Fyll den med en halverad citron, vitlöken och timjan.",
          "Lägg kycklingen på potatisen. Pressa över saften från den andra citronen.",
          "Rosta i 1 timme och 15 minuter tills köttsaften är klar och potatisen gyllene. Låt vila 10 minuter innan den skärs upp.",
        ],
      },
    ],
  },
  {
    title: "Hemgjord pizza med skinka och champinjoner",
    description: "Fredagspizza på egen deg, med tomatsås, mozzarella, skinka och champinjoner.",
    servings: 4,
    createdAt: "2025-06-13T16:50:00.000Z",
    tags: ["Italian", "Pork", "Dairy"],
    profile: { isDinner: true, base: "bread", protein: "pork", effort: "involved", isTreat: true },
    ingredients: [
      {
        heading: "Deg",
        items: [
          "25 g jäst",
          "3 dl ljummet vatten",
          "2 msk olivolja",
          "1 tsk salt",
          "ca 8 dl vetemjöl",
        ],
      },
      {
        heading: "Fyllning",
        items: [
          "2 dl krossade tomater",
          "1 tsk torkad oregano",
          "250 g riven mozzarella",
          "200 g kokt skinka",
          "250 g champinjoner, skivade",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Lös jästen i vattnet. Tillsätt olja, salt och nästan allt mjöl och arbeta degen smidig i 5 minuter.",
          "Låt degen jäsa under bakduk i 45 minuter.",
          "Sätt ugnen på 250 °C. Rör ihop krossade tomater med oregano och salt.",
          "Dela degen i fyra delar och kavla ut tunna bottnar. Bred på tomatsås och lägg på ost, skinka och champinjoner.",
          "Grädda en pizza i taget mitt i ugnen i 10–12 minuter.",
        ],
      },
    ],
  },
  {
    title: "Smashburgare med coleslaw",
    description:
      "Krispiga smashburgare med cheddar, picklad gurka och krämig coleslaw i briochebröd.",
    servings: 4,
    createdAt: "2025-06-20T17:15:00.000Z",
    tags: ["American", "Beef"],
    profile: { isDinner: true, base: "bread", protein: "beef", effort: "normal", isTreat: true },
    ingredients: [
      {
        heading: "Burgare",
        items: [
          "600 g nötfärs",
          "8 skivor cheddar",
          "4 briochebröd",
          "Picklad gurka",
          "Hamburgerdressing",
          "Salt och peppar",
        ],
      },
      {
        heading: "Coleslaw",
        items: [
          "¼ vitkål, strimlad",
          "2 morötter, rivna",
          "1 dl majonnäs",
          "1 msk äppelcidervinäger",
        ],
      },
    ],
    instructions: [
      {
        items: [
          "Blanda kål, morötter, majonnäs och vinäger. Smaka av med salt och peppar.",
          "Rulla färsen till åtta bollar. Hetta upp en stekpanna av gjutjärn ordentligt.",
          "Lägg bollarna i pannan och platta till dem hårt med en stekspade. Salta och peppra.",
          "Vänd efter 2 minuter, lägg på cheddar och stek 1 minut till.",
          "Rosta bröden och bygg burgarna med två biffar, gurka, dressing och coleslaw.",
        ],
      },
    ],
  },
];

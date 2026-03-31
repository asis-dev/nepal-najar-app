/**
 * Nepal geographic data — provinces, districts, and their relationships
 * Used for programmatic SEO page generation
 */

export interface Province {
  slug: string;
  name: string;
  nameNe: string;
  capital: string;
  capitalNe: string;
  districts: District[];
}

export interface District {
  slug: string;
  name: string;
  nameNe: string;
  province: string; // province slug
}

export const PROVINCES: Province[] = [
  {
    slug: 'koshi',
    name: 'Koshi Province',
    nameNe: 'कोशी प्रदेश',
    capital: 'Biratnagar',
    capitalNe: 'विराटनगर',
    districts: [
      { slug: 'taplejung', name: 'Taplejung', nameNe: 'ताप्लेजुङ', province: 'koshi' },
      { slug: 'panchthar', name: 'Panchthar', nameNe: 'पाँचथर', province: 'koshi' },
      { slug: 'ilam', name: 'Ilam', nameNe: 'इलाम', province: 'koshi' },
      { slug: 'jhapa', name: 'Jhapa', nameNe: 'झापा', province: 'koshi' },
      { slug: 'morang', name: 'Morang', nameNe: 'मोरङ', province: 'koshi' },
      { slug: 'sunsari', name: 'Sunsari', nameNe: 'सुनसरी', province: 'koshi' },
      { slug: 'dhankuta', name: 'Dhankuta', nameNe: 'धनकुटा', province: 'koshi' },
      { slug: 'terhathum', name: 'Terhathum', nameNe: 'तेह्रथुम', province: 'koshi' },
      { slug: 'sankhuwasabha', name: 'Sankhuwasabha', nameNe: 'संखुवासभा', province: 'koshi' },
      { slug: 'bhojpur', name: 'Bhojpur', nameNe: 'भोजपुर', province: 'koshi' },
      { slug: 'solukhumbu', name: 'Solukhumbu', nameNe: 'सोलुखुम्बु', province: 'koshi' },
      { slug: 'okhaldhunga', name: 'Okhaldhunga', nameNe: 'ओखलढुङ्गा', province: 'koshi' },
      { slug: 'khotang', name: 'Khotang', nameNe: 'खोटाङ', province: 'koshi' },
      { slug: 'udayapur', name: 'Udayapur', nameNe: 'उदयपुर', province: 'koshi' },
    ],
  },
  {
    slug: 'madhesh',
    name: 'Madhesh Province',
    nameNe: 'मधेश प्रदेश',
    capital: 'Janakpur',
    capitalNe: 'जनकपुर',
    districts: [
      { slug: 'saptari', name: 'Saptari', nameNe: 'सप्तरी', province: 'madhesh' },
      { slug: 'siraha', name: 'Siraha', nameNe: 'सिराहा', province: 'madhesh' },
      { slug: 'dhanusha', name: 'Dhanusha', nameNe: 'धनुषा', province: 'madhesh' },
      { slug: 'mahottari', name: 'Mahottari', nameNe: 'महोत्तरी', province: 'madhesh' },
      { slug: 'sarlahi', name: 'Sarlahi', nameNe: 'सर्लाही', province: 'madhesh' },
      { slug: 'rautahat', name: 'Rautahat', nameNe: 'रौतहट', province: 'madhesh' },
      { slug: 'bara', name: 'Bara', nameNe: 'बारा', province: 'madhesh' },
      { slug: 'parsa', name: 'Parsa', nameNe: 'पर्सा', province: 'madhesh' },
    ],
  },
  {
    slug: 'bagmati',
    name: 'Bagmati Province',
    nameNe: 'बागमती प्रदेश',
    capital: 'Hetauda',
    capitalNe: 'हेटौंडा',
    districts: [
      { slug: 'dolakha', name: 'Dolakha', nameNe: 'दोलखा', province: 'bagmati' },
      { slug: 'sindhupalchok', name: 'Sindhupalchok', nameNe: 'सिन्धुपाल्चोक', province: 'bagmati' },
      { slug: 'rasuwa', name: 'Rasuwa', nameNe: 'रसुवा', province: 'bagmati' },
      { slug: 'nuwakot', name: 'Nuwakot', nameNe: 'नुवाकोट', province: 'bagmati' },
      { slug: 'dhading', name: 'Dhading', nameNe: 'धादिङ', province: 'bagmati' },
      { slug: 'kathmandu', name: 'Kathmandu', nameNe: 'काठमाडौं', province: 'bagmati' },
      { slug: 'bhaktapur', name: 'Bhaktapur', nameNe: 'भक्तपुर', province: 'bagmati' },
      { slug: 'lalitpur', name: 'Lalitpur', nameNe: 'ललितपुर', province: 'bagmati' },
      { slug: 'kavrepalanchok', name: 'Kavrepalanchok', nameNe: 'काभ्रेपलाञ्चोक', province: 'bagmati' },
      { slug: 'ramechhap', name: 'Ramechhap', nameNe: 'रामेछाप', province: 'bagmati' },
      { slug: 'sindhuli', name: 'Sindhuli', nameNe: 'सिन्धुली', province: 'bagmati' },
      { slug: 'makwanpur', name: 'Makwanpur', nameNe: 'मकवानपुर', province: 'bagmati' },
      { slug: 'chitwan', name: 'Chitwan', nameNe: 'चितवन', province: 'bagmati' },
    ],
  },
  {
    slug: 'gandaki',
    name: 'Gandaki Province',
    nameNe: 'गण्डकी प्रदेश',
    capital: 'Pokhara',
    capitalNe: 'पोखरा',
    districts: [
      { slug: 'gorkha', name: 'Gorkha', nameNe: 'गोरखा', province: 'gandaki' },
      { slug: 'lamjung', name: 'Lamjung', nameNe: 'लमजुङ', province: 'gandaki' },
      { slug: 'tanahu', name: 'Tanahu', nameNe: 'तनहुँ', province: 'gandaki' },
      { slug: 'syangja', name: 'Syangja', nameNe: 'स्याङ्जा', province: 'gandaki' },
      { slug: 'kaski', name: 'Kaski', nameNe: 'कास्की', province: 'gandaki' },
      { slug: 'manang', name: 'Manang', nameNe: 'मनाङ', province: 'gandaki' },
      { slug: 'mustang', name: 'Mustang', nameNe: 'मुस्ताङ', province: 'gandaki' },
      { slug: 'myagdi', name: 'Myagdi', nameNe: 'म्याग्दी', province: 'gandaki' },
      { slug: 'parbat', name: 'Parbat', nameNe: 'पर्वत', province: 'gandaki' },
      { slug: 'baglung', name: 'Baglung', nameNe: 'बागलुङ', province: 'gandaki' },
      { slug: 'nawalparasi-east', name: 'Nawalparasi East', nameNe: 'नवलपरासी (पूर्व)', province: 'gandaki' },
    ],
  },
  {
    slug: 'lumbini',
    name: 'Lumbini Province',
    nameNe: 'लुम्बिनी प्रदेश',
    capital: 'Deukhuri',
    capitalNe: 'देउखुरी',
    districts: [
      { slug: 'nawalparasi-west', name: 'Nawalparasi West', nameNe: 'नवलपरासी (पश्चिम)', province: 'lumbini' },
      { slug: 'rupandehi', name: 'Rupandehi', nameNe: 'रुपन्देही', province: 'lumbini' },
      { slug: 'kapilvastu', name: 'Kapilvastu', nameNe: 'कपिलवस्तु', province: 'lumbini' },
      { slug: 'palpa', name: 'Palpa', nameNe: 'पाल्पा', province: 'lumbini' },
      { slug: 'arghakhanchi', name: 'Arghakhanchi', nameNe: 'अर्घाखाँची', province: 'lumbini' },
      { slug: 'gulmi', name: 'Gulmi', nameNe: 'गुल्मी', province: 'lumbini' },
      { slug: 'pyuthan', name: 'Pyuthan', nameNe: 'प्यूठान', province: 'lumbini' },
      { slug: 'rolpa', name: 'Rolpa', nameNe: 'रोल्पा', province: 'lumbini' },
      { slug: 'dang', name: 'Dang', nameNe: 'दाङ', province: 'lumbini' },
      { slug: 'banke', name: 'Banke', nameNe: 'बाँके', province: 'lumbini' },
      { slug: 'bardiya', name: 'Bardiya', nameNe: 'बर्दिया', province: 'lumbini' },
      { slug: 'rukum-east', name: 'Rukum East', nameNe: 'रुकुम (पूर्व)', province: 'lumbini' },
    ],
  },
  {
    slug: 'karnali',
    name: 'Karnali Province',
    nameNe: 'कर्णाली प्रदेश',
    capital: 'Birendranagar',
    capitalNe: 'वीरेन्द्रनगर',
    districts: [
      { slug: 'rukum-west', name: 'Rukum West', nameNe: 'रुकुम (पश्चिम)', province: 'karnali' },
      { slug: 'salyan', name: 'Salyan', nameNe: 'सल्यान', province: 'karnali' },
      { slug: 'surkhet', name: 'Surkhet', nameNe: 'सुर्खेत', province: 'karnali' },
      { slug: 'dailekh', name: 'Dailekh', nameNe: 'दैलेख', province: 'karnali' },
      { slug: 'jajarkot', name: 'Jajarkot', nameNe: 'जाजरकोट', province: 'karnali' },
      { slug: 'dolpa', name: 'Dolpa', nameNe: 'डोल्पा', province: 'karnali' },
      { slug: 'jumla', name: 'Jumla', nameNe: 'जुम्ला', province: 'karnali' },
      { slug: 'kalikot', name: 'Kalikot', nameNe: 'कालिकोट', province: 'karnali' },
      { slug: 'mugu', name: 'Mugu', nameNe: 'मुगु', province: 'karnali' },
      { slug: 'humla', name: 'Humla', nameNe: 'हुम्ला', province: 'karnali' },
    ],
  },
  {
    slug: 'sudurpashchim',
    name: 'Sudurpashchim Province',
    nameNe: 'सुदूरपश्चिम प्रदेश',
    capital: 'Godawari',
    capitalNe: 'गोदावरी',
    districts: [
      { slug: 'bajura', name: 'Bajura', nameNe: 'बाजुरा', province: 'sudurpashchim' },
      { slug: 'bajhang', name: 'Bajhang', nameNe: 'बझाङ', province: 'sudurpashchim' },
      { slug: 'darchula', name: 'Darchula', nameNe: 'दार्चुला', province: 'sudurpashchim' },
      { slug: 'baitadi', name: 'Baitadi', nameNe: 'बैतडी', province: 'sudurpashchim' },
      { slug: 'dadeldhura', name: 'Dadeldhura', nameNe: 'डडेल्धुरा', province: 'sudurpashchim' },
      { slug: 'doti', name: 'Doti', nameNe: 'डोटी', province: 'sudurpashchim' },
      { slug: 'achham', name: 'Achham', nameNe: 'अछाम', province: 'sudurpashchim' },
      { slug: 'kailali', name: 'Kailali', nameNe: 'कैलाली', province: 'sudurpashchim' },
      { slug: 'kanchanpur', name: 'Kanchanpur', nameNe: 'कञ्चनपुर', province: 'sudurpashchim' },
    ],
  },
];

/** Flat array of all 77 districts */
export const ALL_DISTRICTS: District[] = PROVINCES.flatMap((p) => p.districts);

/** Get province by slug */
export function getProvince(slug: string): Province | undefined {
  return PROVINCES.find((p) => p.slug === slug);
}

/** Get district by slug */
export function getDistrict(slug: string): District | undefined {
  return ALL_DISTRICTS.find((d) => d.slug === slug);
}

/** Map province name (as used in promises data) to slug */
export function provinceNameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

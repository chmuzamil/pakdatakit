/**
 * Generates expanded PakDataKit data files.
 * Run: node scripts/generate-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const PROVINCE_NAMES = {
  JK: 'Azad Jammu and Kashmir',
  BA: 'Balochistan',
  NA: 'Gilgit-Baltistan',
  IS: 'Islamabad Capital Territory',
  NW: 'Khyber Pakhtunkhwa',
  PB: 'Punjab',
  SD: 'Sindh',
};

/**
 * Administrative districts as of October 2026 (sources in DATA.md).
 * Duplicates are removed below.
 */
const DISTRICTS_RAW = [
  ['Abbottabad', 'NW'],
  ['Astore', 'NA'],
  ['Attock', 'PB'],
  ['Awaran', 'BA'],
  ['Badin', 'SD'],
  ['Bagh', 'JK'],
  ['Bahawalnagar', 'PB'],
  ['Bahawalpur', 'PB'],
  ['Bajaur', 'NW'],
  ['Bannu', 'NW'],
  ['Barkhan', 'BA'],
  ['Batagram', 'NW'],
  ['Bhakkar', 'PB'],
  ['Bhimber', 'JK'],
  ['Buner', 'NW'],
  ['Chagai', 'BA'],
  ['Chakwal', 'PB'],
  ['Chaman', 'BA'],
  ['Charsadda', 'NW'],
  ['Chiniot', 'PB'],
  ['Dadu', 'SD'],
  ['South Dera Bugti', 'BA'],
  ['Dera Ghazi Khan', 'PB'],
  ['Dera Ismail Khan', 'NW'],
  ['Diamer', 'NA'],
  ['Duki', 'BA'],
  ['Faisalabad', 'PB'],
  ['Ghanche', 'NA'],
  ['Ghizer', 'NA'],
  ['Ghotki', 'SD'],
  ['Gilgit', 'NA'],
  ['Gujranwala', 'PB'],
  ['Gujrat', 'PB'],
  ['Gwadar', 'BA'],
  ['Hafizabad', 'PB'],
  ['Hangu', 'NW'],
  ['Haripur', 'NW'],
  ['Harnai', 'BA'],
  ['Hatian Bala', 'JK'],
  ['Haveli', 'JK'],
  ['Hunza', 'NA'],
  ['Hyderabad', 'SD'],
  ['Islamabad', 'IS'],
  ['Jacobabad', 'SD'],
  ['Jaffarabad', 'BA'],
  ['Jamshoro', 'SD'],
  ['Jhal Magsi', 'BA'],
  ['Jhang', 'PB'],
  ['Jhelum', 'PB'],
  ['Kachhi', 'BA'],
  ['Kalat', 'BA'],
  ['Karachi Central', 'SD'],
  ['Karachi East', 'SD'],
  ['Karachi South', 'SD'],
  ['Karachi West', 'SD'],
  ['Karak', 'NW'],
  ['Kashmore', 'SD'],
  ['Kasur', 'PB'],
  ['Keamari', 'SD'],
  ['Kech', 'BA'],
  ['Khairpur', 'SD'],
  ['Khanewal', 'PB'],
  ['Kharan', 'BA'],
  ['Kharmang', 'NA'],
  ['Khushab', 'PB'],
  ['Khuzdar', 'BA'],
  ['Khyber', 'NW'],
  ['Killa Abdullah', 'BA'],
  ['Killa Saifullah', 'BA'],
  ['Kohat', 'NW'],
  ['Kohlu', 'BA'],
  ['Kolai-Palas', 'NW'],
  ['Korangi', 'SD'],
  ['Kot Addu', 'PB'],
  ['Kotli', 'JK'],
  ['Kurram', 'NW'],
  ['Lahore', 'PB'],
  ['Lakki Marwat', 'NW'],
  ['Larkana', 'SD'],
  ['Lasbela', 'BA'],
  ['Layyah', 'PB'],
  ['Lodhran', 'PB'],
  ['Loralai', 'BA'],
  ['Lower Chitral', 'NW'],
  ['Lower Dir', 'NW'],
  ['Lower Kohistan', 'NW'],
  ['Malakand', 'NW'],
  ['Malir', 'SD'],
  ['Mandi Bahauddin', 'PB'],
  ['Mansehra', 'NW'],
  ['Mardan', 'NW'],
  ['Mastung', 'BA'],
  ['Matiari', 'SD'],
  ['Mianwali', 'PB'],
  ['Mirpur', 'JK'],
  ['Mirpur Khas', 'SD'],
  ['Mohmand', 'NW'],
  ['Multan', 'PB'],
  ['Murree', 'PB'],
  ['Musakhel', 'BA'],
  ['Muzaffarabad', 'JK'],
  ['Muzaffargarh', 'PB'],
  ['Nagar', 'NA'],
  ['Nankana Sahib', 'PB'],
  ['Narowal', 'PB'],
  ['Nasirabad', 'BA'],
  ['Naushahro Feroze', 'SD'],
  ['Neelam', 'JK'],
  ['North Waziristan', 'NW'],
  ['Nowshera', 'NW'],
  ['Nushki', 'BA'],
  ['Okara', 'PB'],
  ['Orakzai', 'NW'],
  ['Pakpattan', 'PB'],
  ['Panjgur', 'BA'],
  ['Peshawar', 'NW'],
  ['Pishin', 'BA'],
  ['Poonch', 'JK'],
  ['Qambar Shahdadkot', 'SD'],
  ['Quetta East', 'BA'],
  ['Quetta West', 'BA'],
  ['Rahim Yar Khan', 'PB'],
  ['Rajanpur', 'PB'],
  ['Rawalpindi', 'PB'],
  ['Sahiwal', 'PB'],
  ['Sanghar', 'SD'],
  ['Sargodha', 'PB'],
  ['Shaheed Benazir Abad', 'SD'],
  ['Shangla', 'NW'],
  ['Sheerani', 'BA'],
  ['Sheikhupura', 'PB'],
  ['Shigar', 'NA'],
  ['Shikarpur', 'SD'],
  ['Sialkot', 'PB'],
  ['Sibi', 'BA'],
  ['Skardu', 'NA'],
  ['Sohbatpur', 'BA'],
  ['Lower South Waziristan', 'NW'],
  ['Upper South Waziristan', 'NW'],
  ['Sudhnuti', 'JK'],
  ['Sujawal', 'SD'],
  ['Sukkur', 'SD'],
  ['Surab', 'BA'],
  ['Swabi', 'NW'],
  ['Swat', 'NW'],
  ['Talagang', 'PB'],
  ['Tando Allahyar', 'SD'],
  ['Tando Muhammad Khan', 'SD'],
  ['Tank', 'NW'],
  ['Tharparkar', 'SD'],
  ['Thatta', 'SD'],
  ['Toba Tek Singh', 'PB'],
  ['Tor Ghar', 'NW'],
  ['Umerkot', 'SD'],
  ['Upper Chitral', 'NW'],
  ['Upper Dir', 'NW'],
  ['Upper Kohistan', 'NW'],
  ['Vehari', 'PB'],
  ['Washuk', 'BA'],
  ['Wazirabad', 'PB'],
  ['Zhob', 'BA'],
  ['Ziarat', 'BA'],
  // Districts created 2019-2022
  // Khyber Pakhtunkhwa, 2023-2026: Central Dir and Allai (Jan 2023),
  // Paharpur (Nov 2025), Bar Swat (Jan 2026). KP now has 40 districts.
  ['Allai', 'NW'],
  ['Central Dir', 'NW'],
  ['Paharpur', 'NW'],
  ['Bar Swat', 'NW'],
  // Balochistan, 2026: 41 districts in 11 divisions (8 Jul 2026). Quetta was
  // split into East and West; Dera Bugti into North and South.
  ['Barshore', 'BA'],
  ['North Dera Bugti', 'BA'],
  ['Tump', 'BA'],
  ['Wadh', 'BA'],
  ['Taunsa', 'PB'],
  ['Hub', 'BA'],
  ['Usta Muhammad', 'BA'],
  ['Darel', 'NA'],
  ['Gupis-Yasin', 'NA'],
  ['Tangir', 'NA'],
  ['Rondu', 'NA'],
  ['Hunza', 'NA'],
  ['Shigar', 'NA'],
  ['Ghizer', 'NA'],
  ['Ghanche', 'NA'],
  ['Astore', 'NA'],
  ['Nagar', 'NA'],
  ['Kharmang', 'NA'],
];

const districts = [...new Map(DISTRICTS_RAW).entries()]
  .map(([district, code]) => ({
    district,
    province: PROVINCE_NAMES[code],
  }))
  .sort((a, b) => a.district.localeCompare(b.district));

const CORE_CITIES = [
  ['Karachi', 'Sindh'],
  ['Lahore', 'Punjab'],
  ['Islamabad', 'Islamabad Capital Territory'],
  ['Rawalpindi', 'Punjab'],
  ['Faisalabad', 'Punjab'],
  ['Multan', 'Punjab'],
  ['Hyderabad', 'Sindh'],
  ['Peshawar', 'Khyber Pakhtunkhwa'],
  ['Quetta', 'Balochistan'],
  ['Gujranwala', 'Punjab'],
  ['Sialkot', 'Punjab'],
  ['Sukkur', 'Sindh'],
];

/** Cities and towns (district HQs + major urban centres). */
const citiesMap = new Map();

for (const [city, province] of CORE_CITIES) {
  citiesMap.set(city, province);
}

const additionalCities = [
  ['Wah Cantonment', 'Punjab'],
  ['Mingora', 'Khyber Pakhtunkhwa'],
  ['Kamoke', 'Punjab'],
  ['Burewala', 'Punjab'],
  ['Gojra', 'Punjab'],
  ['Jaranwala', 'Punjab'],
  ['Chishtian', 'Punjab'],
  ['Kharian', 'Punjab'],
  ['Kandhkot', 'Sindh'],
  ['Hasilpur', 'Punjab'],
  ['Arifwala', 'Punjab'],
  ['Kamalia', 'Punjab'],
  ['Chichawatni', 'Punjab'],
  ['Mian Channu', 'Punjab'],
  ['Bhalwal', 'Punjab'],
  ['Sadiqabad', 'Punjab'],
  ['Shahdadkot', 'Sindh'],
  ['Hub', 'Balochistan'],
  ['Rawalakot', 'Azad Jammu and Kashmir'],
  ['Shahdadpur', 'Sindh'],
  ['Parachinar', 'Khyber Pakhtunkhwa'],
  ['Taxila', 'Punjab'],
  ['Bhawana', 'Punjab'],
  ['Daska', 'Punjab'],
  ['Pasrur', 'Punjab'],
  ['Zafarwal', 'Punjab'],
  ['Shakargarh', 'Punjab'],
  ['Phalia', 'Punjab'],
  ['Kot Momin', 'Punjab'],
  ['Pir Mahal', 'Punjab'],
  ['Khanpur', 'Punjab'],
  ['Liaquatpur', 'Punjab'],
  ['Fort Abbas', 'Punjab'],
  ['Haroonabad', 'Punjab'],
  ['Chunian', 'Punjab'],
  ['Pattoki', 'Punjab'],
  ['Renala Khurd', 'Punjab'],
  ['Depalpur', 'Punjab'],
  ['Dunyapur', 'Punjab'],
  ['Ahmadpur East', 'Punjab'],
  ['Yazman', 'Punjab'],
  ['Rojhan', 'Punjab'],
  ['Jampur', 'Punjab'],
  ['Kot Radha Kishan', 'Punjab'],
  ['Shahkot', 'Punjab'],
  ['Samundri', 'Punjab'],
  ['Tandlianwala', 'Punjab'],
  ['Kot Abdul Malik', 'Punjab'],
  ['Nawabshah', 'Sindh'],
  ['Chitral', 'Khyber Pakhtunkhwa'],
  ['Turbat', 'Balochistan'],
  ['Kotri', 'Sindh'],
  ['Hala', 'Sindh'],
  ['Moro', 'Sindh'],
  ['Mehrabpur', 'Sindh'],
  ['Ratodero', 'Sindh'],
  ['Kandiaro', 'Sindh'],
  ['Mithi', 'Sindh'],
  ['Diplo', 'Sindh'],
  ['Chhor', 'Sindh'],
  ['Khipro', 'Sindh'],
  ['Sanghar City', 'Sindh'],
  ['Khairpur Nathan Shah', 'Sindh'],
  ['Sehwan', 'Sindh'],
  ['Ranipur', 'Sindh'],
  ['Gambat', 'Sindh'],
  ['Havelian', 'Khyber Pakhtunkhwa'],
  ['Timergara', 'Khyber Pakhtunkhwa'],
  ['Batkhela', 'Khyber Pakhtunkhwa'],
  ['Daggar', 'Khyber Pakhtunkhwa'],
  ['Alpuri', 'Khyber Pakhtunkhwa'],
  ['Bahrain', 'Khyber Pakhtunkhwa'],
  ['Kalam', 'Khyber Pakhtunkhwa'],
  ['Dir', 'Khyber Pakhtunkhwa'],
  ['Landi Kotal', 'Khyber Pakhtunkhwa'],
  ['Wana', 'Khyber Pakhtunkhwa'],
  ['Miranshah', 'Khyber Pakhtunkhwa'],
  ['Khaar', 'Khyber Pakhtunkhwa'],
  ['Ghalanai', 'Khyber Pakhtunkhwa'],
  ['Kalaya', 'Khyber Pakhtunkhwa'],
  ['Athmuqam', 'Azad Jammu and Kashmir'],
  ['Palandri', 'Azad Jammu and Kashmir'],
  ['Bagh City', 'Azad Jammu and Kashmir'],
  ['Hattian Bala Town', 'Azad Jammu and Kashmir'],
  ['Aliabad', 'Gilgit-Baltistan'],
  ['Khaplu', 'Gilgit-Baltistan'],
  ['Gahkuch', 'Gilgit-Baltistan'],
  ['Chilas', 'Gilgit-Baltistan'],
  ['Uthal', 'Balochistan'],
  ['Dalbandin', 'Balochistan'],
  ['Khuzdar City', 'Balochistan'],
  ['Dera Murad Jamali', 'Balochistan'],
  ['Dera Allah Yar', 'Balochistan'],
  ['Sibi Town', 'Balochistan'],
  ['Loralai Town', 'Balochistan'],
  ['Zhob City', 'Balochistan'],
  ['Chaman Town', 'Balochistan'],
  ['Pishin Town', 'Balochistan'],
  ['Mastung Town', 'Balochistan'],
  ['Kalat Town', 'Balochistan'],
  ['Pasni', 'Balochistan'],
  ['Ormara', 'Balochistan'],
  ['Jiwani', 'Balochistan'],
  ['Bela', 'Balochistan'],
  ['Winder', 'Balochistan'],
  ['Gaddani', 'Balochistan'],
  ['Kohlu Town', 'Balochistan'],
  ['Dhadar', 'Balochistan'],
  ['Sohbatpur Town', 'Balochistan'],
  ['Satiana', 'Punjab'],
  ['Shorkot', 'Punjab'],
  ['Kabirwala', 'Punjab'],
  ['Mailsi', 'Punjab'],
  ['Vehari City', 'Punjab'],
  ['Burewala City', 'Punjab'],
  ['Chak Jhumra', 'Punjab'],
  ['Jaranwala City', 'Punjab'],
  ['Sammundri', 'Punjab'],
  ['Khurrianwala', 'Punjab'],
  ['Sangla Hill', 'Punjab'],
  ['Shahpur', 'Punjab'],
  ['Kallar Kahar', 'Punjab'],
  ['Talagang City', 'Punjab'],
  ['Lawa', 'Punjab'],
  ['Pind Dadan Khan', 'Punjab'],
  ['Dina', 'Punjab'],
  ['Sohawa', 'Punjab'],
  ['Gujar Khan', 'Punjab'],
  ['Kallar Syedan', 'Punjab'],
  ['Kahuta', 'Punjab'],
  ['Kotli Loharan', 'Punjab'],
  ['Daska City', 'Punjab'],
  ['Wazirabad City', 'Punjab'],
  ['Ali Pur Chattha', 'Punjab'],
  ['Hujra Shah Muqeem', 'Punjab'],
  ['Renala Khurd City', 'Punjab'],
  ['Okara City', 'Punjab'],
  ['Renala Khurd', 'Punjab'],
];

for (const [city, province] of additionalCities) {
  if (!citiesMap.has(city)) {
    citiesMap.set(city, province);
  }
}

// Alias common names
const aliases = [
  ['Nawabshah', 'Shaheed Benazir Abad', 'Sindh'],
  ['Neelum Valley', 'Neelam', 'Azad Jammu and Kashmir'],
];
for (const [alias, canonical, province] of aliases) {
  if (citiesMap.has(canonical) && !citiesMap.has(alias)) {
    citiesMap.set(alias, province);
  }
}

/** Major postal codes — GPO + key areas. primary=true is default for getPostalCode(). */
const POSTAL_CODES = [
  // Islamabad & Rawalpindi
  {
    city: 'Islamabad',
    postalCode: '44000',
    area: 'Islamabad GPO',
    primary: true,
  },
  {
    city: 'Rawalpindi',
    postalCode: '46000',
    area: 'Rawalpindi GPO',
    primary: true,
  },
  { city: 'Rawalpindi', postalCode: '46300', area: 'Satellite Town' },
  { city: 'Murree', postalCode: '47150', area: 'Murree GPO', primary: true },
  { city: 'Taxila', postalCode: '47080', area: 'Taxila', primary: true },
  {
    city: 'Wah Cantonment',
    postalCode: '47040',
    area: 'Wah Cantt GPO',
    primary: true,
  },
  // Punjab major
  { city: 'Lahore', postalCode: '54000', area: 'Lahore GPO', primary: true },
  { city: 'Lahore', postalCode: '54660', area: 'Gulberg' },
  { city: 'Lahore', postalCode: '54700', area: 'Model Town' },
  { city: 'Lahore', postalCode: '54810', area: 'Lahore Cantt' },
  { city: 'Lahore', postalCode: '54570', area: 'Iqbal Town' },
  {
    city: 'Faisalabad',
    postalCode: '38000',
    area: 'Faisalabad GPO',
    primary: true,
  },
  { city: 'Multan', postalCode: '60000', area: 'Multan GPO', primary: true },
  {
    city: 'Gujranwala',
    postalCode: '52250',
    area: 'Gujranwala GPO',
    primary: true,
  },
  { city: 'Sialkot', postalCode: '51310', area: 'Sialkot GPO', primary: true },
  {
    city: 'Sargodha',
    postalCode: '40100',
    area: 'Sargodha GPO',
    primary: true,
  },
  {
    city: 'Bahawalpur',
    postalCode: '63100',
    area: 'Bahawalpur GPO',
    primary: true,
  },
  {
    city: 'Sheikhupura',
    postalCode: '39350',
    area: 'Qila Sheikhupura GPO',
    primary: true,
  },
  { city: 'Gujrat', postalCode: '50700', area: 'Gujrat GPO', primary: true },
  { city: 'Jhang', postalCode: '35200', area: 'Jhang GPO', primary: true },
  { city: 'Sahiwal', postalCode: '57000', area: 'Sahiwal GPO', primary: true },
  { city: 'Okara', postalCode: '56300', area: 'Okara GPO', primary: true },
  { city: 'Kasur', postalCode: '55050', area: 'Kasur GPO', primary: true },
  {
    city: 'Dera Ghazi Khan',
    postalCode: '32200',
    area: 'DG Khan GPO',
    primary: true,
  },
  {
    city: 'Muzaffargarh',
    postalCode: '34200',
    area: 'Muzaffargarh GPO',
    primary: true,
  },
  {
    city: 'Rahim Yar Khan',
    postalCode: '64200',
    area: 'RY Khan GPO',
    primary: true,
  },
  {
    city: 'Bahawalnagar',
    postalCode: '62300',
    area: 'Bahawalnagar GPO',
    primary: true,
  },
  {
    city: 'Khanewal',
    postalCode: '58150',
    area: 'Khanewal GPO',
    primary: true,
  },
  { city: 'Vehari', postalCode: '61100', area: 'Vehari GPO', primary: true },
  {
    city: 'Pakpattan',
    postalCode: '57400',
    area: 'Pakpattan GPO',
    primary: true,
  },
  { city: 'Chiniot', postalCode: '35400', area: 'Chiniot GPO', primary: true },
  {
    city: 'Hafizabad',
    postalCode: '52110',
    area: 'Hafizabad GPO',
    primary: true,
  },
  {
    city: 'Mandi Bahauddin',
    postalCode: '50400',
    area: 'Mandi Bahauddin GPO',
    primary: true,
  },
  { city: 'Jhelum', postalCode: '49600', area: 'Jhelum GPO', primary: true },
  { city: 'Attock', postalCode: '43600', area: 'Attock GPO', primary: true },
  { city: 'Chakwal', postalCode: '48800', area: 'Chakwal GPO', primary: true },
  {
    city: 'Mianwali',
    postalCode: '42200',
    area: 'Mianwali GPO',
    primary: true,
  },
  { city: 'Bhakkar', postalCode: '30000', area: 'Bhakkar GPO', primary: true },
  { city: 'Khushab', postalCode: '41000', area: 'Khushab GPO', primary: true },
  { city: 'Narowal', postalCode: '51600', area: 'Narowal GPO', primary: true },
  {
    city: 'Nankana Sahib',
    postalCode: '39100',
    area: 'Nankana Sahib GPO',
    primary: true,
  },
  {
    city: 'Toba Tek Singh',
    postalCode: '36050',
    area: 'TTS GPO',
    primary: true,
  },
  { city: 'Lodhran', postalCode: '59320', area: 'Lodhran GPO', primary: true },
  { city: 'Layyah', postalCode: '31200', area: 'Layyah GPO', primary: true },
  {
    city: 'Rajanpur',
    postalCode: '33500',
    area: 'Rajanpur GPO',
    primary: true,
  },
  {
    city: 'Wazirabad',
    postalCode: '52000',
    area: 'Wazirabad GPO',
    primary: true,
  },
  {
    city: 'Talagang',
    postalCode: '48100',
    area: 'Talagang GPO',
    primary: true,
  },
  {
    city: 'Kot Addu',
    postalCode: '34050',
    area: 'Kot Addu GPO',
    primary: true,
  },
  // Sindh
  { city: 'Karachi', postalCode: '74200', area: 'Karachi GPO', primary: true },
  { city: 'Karachi', postalCode: '74000', area: 'Karachi City GPO' },
  { city: 'Karachi', postalCode: '74400', area: 'Karachi Saddar GPO' },
  { city: 'Karachi', postalCode: '74800', area: 'New Town GPO' },
  { city: 'Karachi', postalCode: '74700', area: 'Al-Hydri GPO' },
  { city: 'Karachi', postalCode: '75500', area: 'Defence' },
  { city: 'Karachi', postalCode: '75600', area: 'Clifton' },
  { city: 'Karachi', postalCode: '75300', area: 'Gulshan-e-Iqbal' },
  { city: 'Karachi', postalCode: '74600', area: 'Nazimabad' },
  { city: 'Karachi', postalCode: '74900', area: 'Korangi' },
  { city: 'Karachi', postalCode: '75950', area: 'Federal B Area' },
  {
    city: 'Hyderabad',
    postalCode: '71000',
    area: 'Hyderabad GPO',
    primary: true,
  },
  { city: 'Sukkur', postalCode: '65200', area: 'Sukkur GPO', primary: true },
  { city: 'Larkana', postalCode: '77150', area: 'Larkana GPO', primary: true },
  {
    city: 'Nawabshah',
    postalCode: '67450',
    area: 'Nawabshah GPO',
    primary: true,
  },
  {
    city: 'Mirpur Khas',
    postalCode: '69000',
    area: 'Mirpur Khas GPO',
    primary: true,
  },
  {
    city: 'Jacobabad',
    postalCode: '79000',
    area: 'Jacobabad GPO',
    primary: true,
  },
  {
    city: 'Shikarpur',
    postalCode: '78100',
    area: 'Shikarpur GPO',
    primary: true,
  },
  { city: 'Dadu', postalCode: '76200', area: 'Dadu GPO', primary: true },
  { city: 'Badin', postalCode: '72200', area: 'Badin', primary: true },
  { city: 'Thatta', postalCode: '73130', area: 'Thatta', primary: true },
  { city: 'Sanghar', postalCode: '68100', area: 'Sanghar GPO', primary: true },
  { city: 'Umerkot', postalCode: '69100', area: 'Umerkot GPO', primary: true },
  { city: 'Tharparkar', postalCode: '69230', area: 'Mithi GPO', primary: true },
  {
    city: 'Jamshoro',
    postalCode: '76080',
    area: 'University New Campus, Jamshoro',
    primary: true,
  },
  { city: 'Matiari', postalCode: '70150', area: 'Matiari', primary: true },
  {
    city: 'Khairpur',
    postalCode: '66020',
    area: 'Khairpur GPO',
    primary: true,
  },
  { city: 'Ghotki', postalCode: '65110', area: 'Ghotki GPO', primary: true },
  {
    city: 'Kashmore',
    postalCode: '79200',
    area: 'Kashmore GPO',
    primary: true,
  },
  { city: 'Sujawal', postalCode: '73050', area: 'Sujawal', primary: true },
  // KPK
  {
    city: 'Peshawar',
    postalCode: '25000',
    area: 'Peshawar GPO',
    primary: true,
  },
  { city: 'Mardan', postalCode: '23200', area: 'Mardan GPO', primary: true },
  {
    city: 'Abbottabad',
    postalCode: '22010',
    area: 'Abbottabad GPO',
    primary: true,
  },
  { city: 'Kohat', postalCode: '26000', area: 'Kohat GPO', primary: true },
  { city: 'Bannu', postalCode: '28100', area: 'Bannu GPO', primary: true },
  {
    city: 'Swat',
    postalCode: '19200',
    area: 'Saidu Sharif GPO',
    primary: true,
  },
  {
    city: 'Mansehra',
    postalCode: '21300',
    area: 'Mansehra GPO',
    primary: true,
  },
  {
    city: 'Dera Ismail Khan',
    postalCode: '29050',
    area: 'Dera Ismail Khan GPO',
    primary: true,
  },
  {
    city: 'Nowshera',
    postalCode: '24100',
    area: 'Nowshera GPO',
    primary: true,
  },
  { city: 'Swabi', postalCode: '23430', area: 'Swabi GPO', primary: true },
  {
    city: 'Charsadda',
    postalCode: '24420',
    area: 'Charsadda GPO',
    primary: true,
  },
  { city: 'Haripur', postalCode: '22620', area: 'Haripur GPO', primary: true },
  { city: 'Hangu', postalCode: '26190', area: 'Hangu GPO', primary: true },
  { city: 'Karak', postalCode: '27200', area: 'Karak GPO', primary: true },
  { city: 'Tank', postalCode: '29400', area: 'Tank GPO', primary: true },
  {
    city: 'Lakki Marwat',
    postalCode: '28420',
    area: 'Lakki Marwat GPO',
    primary: true,
  },
  // Balochistan
  { city: 'Quetta', postalCode: '87300', area: 'Quetta GPO', primary: true },
  { city: 'Gwadar', postalCode: '91200', area: 'Gwadar GPO', primary: true },
  { city: 'Turbat', postalCode: '92600', area: 'Turbat GPO', primary: true },
  { city: 'Khuzdar', postalCode: '89100', area: 'Khuzdar GPO', primary: true },
  { city: 'Sibi', postalCode: '82000', area: 'Sibi GPO', primary: true },
  { city: 'Loralai', postalCode: '84800', area: 'Loralai GPO', primary: true },
  { city: 'Zhob', postalCode: '85200', area: 'Zhob GPO', primary: true },
  { city: 'Chaman', postalCode: '86000', area: 'Chaman GPO', primary: true },
  { city: 'Hub', postalCode: '90250', area: 'Hub GPO', primary: true },
  // AJK & GB
  {
    city: 'Muzaffarabad',
    postalCode: '13100',
    area: 'Muzaffarabad GPO',
    primary: true,
  },
  { city: 'Mirpur', postalCode: '10250', area: 'Mirpur GPO', primary: true },
  { city: 'Kotli', postalCode: '11100', area: 'Kotli GPO', primary: true },
  {
    city: 'Rawalakot',
    postalCode: '12350',
    area: 'Rawalakot GPO',
    primary: true,
  },
  { city: 'Bagh', postalCode: '12500', area: 'Bagh GPO', primary: true },
  { city: 'Gilgit', postalCode: '15100', area: 'Gilgit GPO', primary: true },
  { city: 'Skardu', postalCode: '16100', area: 'Skardu GPO', primary: true },
];

// Every city with a postal code must also resolve to a province. Postal
// cities missing from the list above are district headquarters that share
// their district's name, so take the province from the district list.
const districtProvince = new Map(
  districts.map((d) => [d.district, d.province]),
);
for (const { city } of POSTAL_CODES) {
  if (citiesMap.has(city)) continue;
  const province = districtProvince.get(city);
  if (province === undefined) {
    throw new Error(`No province for postal city "${city}"`);
  }
  citiesMap.set(city, province);
}

const cities = [...citiesMap.entries()]
  .map(([city, province]) => ({ city, province }))
  .sort((a, b) => a.city.localeCompare(b.city));

/**
 * Pakistan Post's "Post Code Directory of Delivery Post Offices" (Part I),
 * extracted to data/sources/pakpost-delivery-post-offices.csv (see DATA.md).
 * The hand-checked entries in POSTAL_CODES come first and keep their city and
 * primary flag; every other office in the directory is added after them.
 */
const DIRECTORY = readFileSync(
  join(dataDir, 'sources', 'pakpost-delivery-post-offices.csv'),
  'utf8',
)
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    // Only the office name can contain a comma, and then it is quoted.
    const match = /^(?:"((?:[^"]|"")*)"|([^,]*)),(\d{5}),([^,]*),([^,]*)$/.exec(
      line,
    );
    if (!match) throw new Error(`Bad directory line: ${line}`);
    return {
      office: (match[1]?.replaceAll('""', '"') ?? match[2]).trim(),
      postalCode: match[3],
      accountOffice: match[4],
      province: match[5],
    };
  });

/** Account offices inside a large city: their offices belong to that city. */
const METRO_ACCOUNT_OFFICES = {
  'Karachi GPO': 'Karachi',
  'Karachi City GPO': 'Karachi',
  'Karachi Saddar GPO': 'Karachi',
  'Karachi Alhydri GPO': 'Karachi',
  'Korangi GPO': 'Karachi',
  'New Town GPO': 'Karachi',
  'Lahore GPO': 'Lahore',
  'Lahore Cantt GPO': 'Lahore',
  'Islamabad GPO': 'Islamabad',
};

/** Account offices whose name is not simply "<city> GPO". */
const ACCOUNT_OFFICE_CITY = {
  ...METRO_ACCOUNT_OFFICES,
  'T.T Singh GPO': 'Toba Tek Singh',
  'Bahawal Nagar GPO': 'Bahawalnagar',
  'Rahimyar Khan GPO': 'Rahim Yar Khan',
  'Qila Sheikhupura GPO': 'Sheikhupura',
  'Saidu Sharif GPO': 'Swat',
  'Wah Cantt GPO': 'Wah Cantonment',
};

const ACRONYMS = new Set(
  (
    'GPO PAF PMA POF PIA GHQ UET PTCL WAPDA KDA PECHS DHA NPO HMC PNS PARC ' +
    'NIH II III IV VI VII VIII IX XI GB JB RB EB WB SB NB ML TDA KB GD DB ' +
    'DNB AJK PAEC KRL'
  ).split(' '),
);

/** "ABBOTTABAD PUBLIC SCHOOL" -> "Abbottabad Public School". */
function titleCase(name) {
  return name
    .split(' ')
    .map((word) =>
      word
        .split(/(?=[-/(,])|(?<=[-/(,])/)
        .map((part) =>
          ACRONYMS.has(part) ||
          /\d/.test(part) ||
          /^([A-Z]\.)+[A-Z]?$/.test(part)
            ? part
            : part.charAt(0) + part.slice(1).toLowerCase(),
        )
        .join(''),
    )
    .join(' ');
}

const placeKey = (name) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cityByKey = new Map(cities.map((c) => [placeKey(c.city), c]));
const districtKeys = new Set(
  districts.map((d) => `${d.district}|${d.province}`),
);

function accountOfficeCity(accountOffice) {
  return (
    ACCOUNT_OFFICE_CITY[accountOffice] ??
    cityByKey.get(placeKey(accountOffice.replace(/ GPO$/, '')))?.city ??
    null
  );
}

/** The city an office belongs to, or `null` when it is its own locality. */
function officeCity({ office, accountOffice, province }) {
  const key = placeKey(office).replace(/ GPO$/, '');
  const exact = cityByKey.get(key);
  if (exact && exact.province === province) return exact.city;
  const metro = METRO_ACCOUNT_OFFICES[accountOffice];
  if (metro) return metro;
  // "ABBOTTABAD PUBLIC SCHOOL" or "GULISTAN COLONY, FAISALABAD", when the
  // office is also accounted under that city's GPO.
  const home = accountOfficeCity(accountOffice);
  if (home) {
    const homeKey = placeKey(home);
    if (key.startsWith(`${homeKey} `) || key.endsWith(` ${homeKey}`)) {
      return home;
    }
  }
  return null;
}

/** Adds the district (when the city is a district's namesake) and province. */
const withPlace = (entry, province) => ({
  ...entry,
  ...(districtKeys.has(`${entry.city}|${province}`)
    ? { district: entry.city }
    : {}),
  province,
});

const directoryCodes = new Set(DIRECTORY.map((row) => row.postalCode));
const curatedPostal = POSTAL_CODES.map((entry) => {
  if (!directoryCodes.has(entry.postalCode)) {
    throw new Error(`${entry.postalCode} is not in Pakistan Post's directory`);
  }
  return withPlace(entry, citiesMap.get(entry.city));
});
const curatedCodes = new Set(POSTAL_CODES.map((entry) => entry.postalCode));
const curatedCities = new Set(POSTAL_CODES.map((entry) => entry.city));

// The directory lists four codes twice (the same place under two spellings);
// the first row is kept so that every code appears once.
const seenCodes = new Set(curatedCodes);
const bulkPostal = DIRECTORY.filter((row) => {
  if (seenCodes.has(row.postalCode)) return false;
  seenCodes.add(row.postalCode);
  return true;
}).map((row) => {
  const area = titleCase(row.office);
  const city = officeCity(row);
  // A locality that shares its name with a city in another province (Thatta
  // in Attock district) is told apart by its account office.
  const namesake = cityByKey.get(placeKey(area));
  const locality =
    namesake && namesake.province !== row.province
      ? `${area} (${row.accountOffice.replace(/ GPO$/, '')})`
      : area;
  return {
    office: row.office,
    isCity: city !== null,
    entry: withPlace(
      { city: city ?? locality, postalCode: row.postalCode, area },
      row.province,
    ),
  };
});

// A city with no hand-checked entry gets its own office as the primary one:
// "<CITY> GPO" if the directory has it, else the office named after the city.
const primaryFor = new Map();
for (const { office, entry, isCity } of bulkPostal) {
  if (!isCity || curatedCities.has(entry.city)) continue;
  const key = placeKey(office);
  const cityKey = placeKey(entry.city);
  const rank = key === `${cityKey} GPO` ? 2 : key === cityKey ? 1 : 0;
  if (rank > (primaryFor.get(entry.city)?.rank ?? 0)) {
    primaryFor.set(entry.city, { rank, code: entry.postalCode });
  }
}

const postalCodes = [
  ...curatedPostal,
  ...bulkPostal
    .map(({ entry }) => {
      const { city, postalCode, area, ...rest } = entry;
      return primaryFor.get(city)?.code === postalCode
        ? { city, postalCode, area, primary: true, ...rest }
        : entry;
    })
    .sort(
      (a, b) =>
        a.postalCode.localeCompare(b.postalCode) ||
        a.area.localeCompare(b.area),
    ),
];

/**
 * Pakistani IBAN bank codes (characters 5-8 of the IBAN). SBP does not publish
 * a master list, and IBAN codes do not always match SWIFT BIC prefixes, so
 * entries should be confirmed against real IBANs before being added.
 */
const BANKS = [
  { code: 'ABPA', name: 'Allied Bank Limited' },
  { code: 'AIIN', name: 'Al Baraka Bank (Pakistan) Limited' },
  { code: 'ALFH', name: 'Bank Alfalah Limited' },
  { code: 'ASCM', name: 'Askari Bank Limited' },
  { code: 'BAHL', name: 'Bank Al Habib Limited' },
  { code: 'BKIP', name: 'BankIslami Pakistan Limited' },
  { code: 'BPUN', name: 'The Bank of Punjab' },
  { code: 'DUIB', name: 'Dubai Islamic Bank Pakistan Limited' },
  { code: 'FAYS', name: 'Faysal Bank Limited' },
  { code: 'FWOM', name: 'First Women Bank Limited' },
  { code: 'HABB', name: 'Habib Bank Limited' },
  { code: 'JSBL', name: 'JS Bank Limited' },
  { code: 'KHYB', name: 'The Bank of Khyber' },
  { code: 'MCIB', name: 'MCB Islamic Bank Limited' },
  { code: 'MPBL', name: 'Habib Metropolitan Bank Limited' },
  { code: 'MUCB', name: 'MCB Bank Limited' },
  { code: 'MEZN', name: 'Meezan Bank Limited' },
  { code: 'NBPA', name: 'National Bank of Pakistan' },
  { code: 'NIBP', name: 'NIB Bank Limited (merged into MCB Bank)' },
  { code: 'SCBL', name: 'Standard Chartered Bank (Pakistan) Limited' },
  { code: 'SUMB', name: 'Bank Makramah Limited (formerly Summit Bank)' },
  { code: 'UNIL', name: 'United Bank Limited' },
  { code: 'SAMB', name: 'Samba Bank Limited' },
  { code: 'SADA', name: 'SadaPay' },
  { code: 'NAYA', name: 'NayaPay' },
  { code: 'MSHQ', name: 'Mashreq Bank Pakistan Limited' },
  { code: 'RQMI', name: 'Raqami Islamic Digital Bank Limited' },
  { code: 'BKCH', name: 'Bank of China Limited' },
  { code: 'SMES', name: 'SME Bank Limited (in liquidation)' },
  { code: 'SAUD', name: 'Silkbank Limited (merged into United Bank Limited)' },
  { code: 'CITI', name: 'Citibank N.A. Pakistan' },
  { code: 'ICBK', name: 'Industrial and Commercial Bank of China' },
  { code: 'DEUT', name: 'Deutsche Bank AG' },
  { code: 'SBPP', name: 'State Bank of Pakistan' },
  {
    code: 'TMFB',
    name: 'Easypaisa Bank Limited (formerly Telenor Microfinance Bank)',
  },
  { code: 'JCMA', name: 'Mobilink Microfinance Bank (JazzCash)' },
  { code: 'WMBL', name: 'Mobilink Microfinance Bank (JazzCash)' },
  { code: 'SMFB', name: 'Sindh Microfinance Bank' },
  { code: 'ZTBL', name: 'Zarai Taraqiati Bank Limited' },
  { code: 'NRSP', name: 'NRSP Microfinance Bank' },
  {
    code: 'FMFB',
    name: 'HBL Microfinance Bank (formerly First MicroFinance Bank)',
  },
  { code: 'APNA', name: 'Apna Microfinance Bank' },
  { code: 'KHBL', name: 'Khushhali Microfinance Bank' },
  {
    code: 'FINC',
    name: 'ABHI Microfinance Bank (formerly FINCA Microfinance Bank)',
  },
  { code: 'UMBL', name: 'U Microfinance Bank' },
  {
    code: 'TAMW',
    name: 'Easypaisa Bank Limited (formerly Tameer Microfinance Bank)',
  },
  { code: 'SIND', name: 'Sindh Bank Limited' },
  { code: 'SONE', name: 'Soneri Bank Limited' },
  // Legacy codes seen in older IBANs
  { code: 'NBPB', name: 'National Bank of Pakistan' },
  { code: 'MCBL', name: 'MCB Bank Limited' },
  { code: 'UNIL', name: 'United Bank Limited' },
]
  .filter((bank, index, arr) => {
    // Dedupe UNIL
    return arr.findIndex((b) => b.code === bank.code) === index;
  })
  .sort((a, b) => a.code.localeCompare(b.code));

function writeJson(name, data) {
  const path = join(dataDir, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${name}: ${Array.isArray(data) ? data.length : 'object'} entries`,
  );
}

/**
 * Divisions and tehsils from the 2023 census (PBS Table 1), extracted to
 * data/sources/census-2023-admin-units.csv: one row per tehsil-level unit with
 * its province, division and district as the census printed them.
 */
const CENSUS_UNITS = readFileSync(
  join(dataDir, 'sources', 'census-2023-admin-units.csv'),
  'utf8',
)
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [province, division, district, unit, type] = line.split(',');
    return { province, division, district, unit, type };
  });

/** Census spellings that differ from the district names in districts.json. */
const CENSUS_DISTRICT_NAMES = {
  'KAMBAR SHAHDAD KOT': 'Qambar Shahdadkot',
  'SHAHEED BENAZIRABAD': 'Shaheed Benazir Abad',
  'UMER KOT': 'Umerkot',
  'KOLAI PALAS KOHISTAN': 'Kolai-Palas',
  TORGHAR: 'Tor Ghar',
  SHERANI: 'Sheerani',
  // Split since the census; these names are no longer districts.
  'SOUTH WAZIRISTAN': 'South Waziristan',
  QUETTA: 'Quetta',
  'DERA BUGTI': 'Dera Bugti',
};

/** "KOH-E-SULEMAN" -> "Koh-e-Suleman", "18-HAZARI" -> "18-Hazari". */
const unitName = (name) =>
  titleCase(name)
    .replace(/-E-/g, '-e-')
    .replace(/\bF\.r\b/g, 'F.R')
    .replace('(S.f.rahu)', '(S.F. Rahu)');

const districtByKey = new Map(
  districts.map((d) => [`${placeKey(d.district)}|${d.province}`, d.district]),
);
const censusDistrictName = (district, province) => {
  const name =
    CENSUS_DISTRICT_NAMES[district] ??
    districtByKey.get(`${placeKey(district)}|${province}`);
  if (!name) throw new Error(`Unknown census district "${district}"`);
  return name;
};

/**
 * Districts created or split after the census, and the census district each
 * came from. A tehsil in one of the parent districts may have moved, so its
 * current district is recorded only when an official source confirms it
 * (CONFIRMED_CURRENT_DISTRICT); otherwise it is null.
 */
const POST_CENSUS_DISTRICTS = {
  Murree: 'Rawalpindi',
  Talagang: 'Chakwal',
  Wazirabad: 'Gujranwala',
  'Kot Addu': 'Muzaffargarh',
  Taunsa: 'Dera Ghazi Khan',
  'Lower South Waziristan': 'South Waziristan',
  'Upper South Waziristan': 'South Waziristan',
  'Central Dir': 'Upper Dir',
  Allai: 'Batagram',
  Paharpur: 'Dera Ismail Khan',
  'Bar Swat': 'Swat',
  Hub: 'Lasbela',
  'Usta Muhammad': 'Jaffarabad',
  'Quetta East': 'Quetta',
  'Quetta West': 'Quetta',
  'North Dera Bugti': 'Dera Bugti',
  'South Dera Bugti': 'Dera Bugti',
  Barshore: 'Pishin',
  Tump: 'Kech',
  Wadh: 'Khuzdar',
};
const SPLIT_PARENTS = new Set(Object.values(POST_CENSUS_DISTRICTS));

/**
 * `"<census district>|<tehsil>"` -> current district, each from an official
 * source listed in DATA.md.
 */
const CONFIRMED_CURRENT_DISTRICT = {/*CONFIRMED*/};

const tehsils = CENSUS_UNITS.map((row) => {
  const censusDistrict = censusDistrictName(row.district, row.province);
  const tehsil = unitName(row.unit);
  const confirmed = CONFIRMED_CURRENT_DISTRICT[`${censusDistrict}|${tehsil}`];
  if (
    confirmed &&
    !districtByKey.has(`${placeKey(confirmed)}|${row.province}`)
  ) {
    throw new Error(`Unknown current district "${confirmed}"`);
  }
  return {
    tehsil,
    type: row.type,
    censusDistrict,
    currentDistrict:
      confirmed ?? (SPLIT_PARENTS.has(censusDistrict) ? null : censusDistrict),
    province: row.province,
  };
}).sort(
  (a, b) =>
    a.province.localeCompare(b.province) ||
    a.censusDistrict.localeCompare(b.censusDistrict) ||
    a.tehsil.localeCompare(b.tehsil),
);
for (const key of Object.keys(CONFIRMED_CURRENT_DISTRICT)) {
  const [district, name] = key.split('|');
  if (
    !tehsils.some((t) => t.censusDistrict === district && t.tehsil === name)
  ) {
    throw new Error(`No census tehsil "${key}"`);
  }
}

const divisionMap = new Map();
for (const row of CENSUS_UNITS) {
  if (row.division === '') continue; // Islamabad has no division
  const key = `${row.division}|${row.province}`;
  if (!divisionMap.has(key)) {
    divisionMap.set(key, {
      division: unitName(row.division),
      province: row.province,
      districts: new Set(),
    });
  }
  divisionMap
    .get(key)
    .districts.add(censusDistrictName(row.district, row.province));
}
const divisions = [...divisionMap.values()]
  .map((d) => ({
    ...d,
    districts: [...d.districts].sort((a, b) => a.localeCompare(b)),
  }))
  .sort(
    (a, b) =>
      a.province.localeCompare(b.province) ||
      a.division.localeCompare(b.division),
  );

writeJson('divisions.json', divisions);
writeJson('tehsils.json', tehsils);

writeJson('districts.json', districts);
writeJson('cities.json', cities);
writeJson('postal-codes.json', postalCodes);
/**
 * Bank category, following SBP's grouping of scheduled banks: public sector
 * commercial banks, full-fledged Islamic banks, microfinance banks, digital
 * banks, electronic money institutions (EMIs), branches of foreign banks,
 * specialized banks and the central bank. Everything else is a commercial
 * bank (SBP's "local private banks").
 */
const BANK_TYPES = {
  'public-sector': ['BPUN', 'KHYB', 'NBPA', 'NBPB', 'SIND'],
  islamic: ['AIIN', 'BKIP', 'DUIB', 'FAYS', 'MCIB', 'MEZN'],
  microfinance: [
    'APNA',
    'FINC',
    'FMFB',
    'JCMA',
    'KHBL',
    'NRSP',
    'SMFB',
    'UMBL',
    'WMBL',
  ],
  digital: ['MSHQ', 'RQMI', 'TAMW', 'TMFB'],
  emi: ['NAYA', 'SADA'],
  foreign: ['BKCH', 'CITI', 'DEUT', 'ICBK'],
  specialized: ['SMES', 'ZTBL'],
  central: ['SBPP'],
};

/** Banks that no longer exist, and the bank (code) that took them over. */
const MERGED_INTO = { NIBP: 'MUCB', SAUD: 'UNIL' };

/** Banks that have closed without a successor (SME Bank: de-scheduled 2025). */
const CLOSED = new Set(['SMES']);

/** Older codes still found on live accounts, and the bank's main code. */
const ALIAS_OF = { MCBL: 'MUCB', NBPB: 'NBPA', TAMW: 'TMFB', WMBL: 'JCMA' };

const bankType = (code) =>
  Object.entries(BANK_TYPES).find(([, codes]) => codes.includes(code))?.[0] ??
  'commercial';

writeJson(
  'banks.json',
  BANKS.map(({ code, name }) => ({
    code,
    name,
    type: bankType(code),
    ...(CLOSED.has(code) ? { active: false } : {}),
    ...(MERGED_INTO[code] ? { mergedInto: MERGED_INTO[code] } : {}),
    ...(ALIAS_OF[code] ? { aliasOf: ALIAS_OF[code] } : {}),
  })),
);

console.log(`\nSummary:`);
console.log(`  Districts: ${districts.length}`);
console.log(`  Cities: ${cities.length}`);
console.log(`  Postal codes: ${postalCodes.length}`);
console.log(`  Banks: ${BANKS.length}`);

## Roman Urdu name spellings (`data/sources/roman-urdu-names.json`)

Not used by the library at run time: a test list for `romanUrduKey`. It
groups everyday spellings of 118 common Pakistani given names and surnames
(277 spellings), compiled for PakDataKit's tests from common usage; it is
not an official list. In 2.7.0, 96.8% of pairs of spellings of the same name
share a key, and 8 of 38,004 pairs of different names (0.021%) do, all from
two close pairs: Sajid and Sajjad, and Amna and Amina. The test suite fails
if these rates get worse than 95% and 0.05%.

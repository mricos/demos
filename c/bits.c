#include<stdio.h> 
#include <stdlib.h>
int main(int argc, char**argv) 
{ 
   float x = 1; 
   //unsigned u = atoi(argv[1]);
   printf("%lu %lu %lu\n", sizeof(x), sizeof(0.1), sizeof(0.1f)); 
   return 0; 
} 

int floatIsEqual(unsigned uf, unsigned ug) {
  // FIXME: Weird timeout when `./btest -f floatIsEqual`
  //
  // Output:
  // ERROR: Test floatIsEqual failed.
  // Timed out after 10 secs (probably infinite loop)

  unsigned mask = ~(1 << 31);
  unsigned f = mask & uf;
  unsigned g = mask & ug;

  if ((f == 0) && (g == 0)) {
    return 1;
  }

  unsigned frac_mask = (~0) + (1 << 23);

  if ((/* uf is NaN */
        ((f >> 23) == 0xFF) && ((frac_mask & uf) != 0)
      ) ||
      (/* ug is NaN */
        ((g >> 23) == 0xFF) && ((frac_mask & ug) != 0)
      )) {
    return 0;
  }

  return uf == ug;
}

/*
 * floatUnsigned2Float - Return bit-level equivalent of expression (float) u
 *   Result is returned as unsigned int, but
 *   it is to be interpreted as the bit-level representation of a
 *   single-precision floating point values.
 *   Legal ops: Any integer/unsigned operations incl. ||, &&. also if, while
 *   Max ops: 30
 *   Rating: 4
 */
unsigned floatUnsigned2Float(unsigned u) {
  unsigned frac;    // frac[22...0] == the frac part of single-precision floating point values.
  unsigned exp = 31; // exp[7...0]   == the exp  part of single-precision floating point values.

  unsigned shift;
  unsigned G, R, S;

  if (u == 0) {
    return 0;
  }

  while((u & (1 << exp)) == 0) {
    exp--;
  }

  if (exp >= 23) {
    shift = exp - 23;
    G = u & (1 << shift);
    R = u & (1 << (shift - 1));
    S = u & ((~0) + (1 << (shift - 1)));

    frac = u >> (exp - 23);

    if ((R && S) || (R && G)) {
      frac = frac + 1;
    }
  } else {
    frac = u << (23 - exp);
  }

  return ((exp + 127) << 23) | (frac & ((~0) + (1 << 23)));
}

unsigned em(unsigned u) {
  return 0x7F800000 & u;
}
unsigned e(unsigned u) {
  return em(u) >> 23;
}

unsigned f(unsigned u) {
  return 0x007FFFFF & u;
}
unsigned s(unsigned u) {
  return 0x80000000 & u;
}

unsigned msb(unsigned u) {
  unsigned msb;
  msb=31;
  while ((u & (1 << msb)) == 0){
     msb--;
  }
  return msb; 
}
unsigned msb2(unsigned u) {
  unsigned msb;
  msb=0;
  while ((0x80000000 & (u << msb)) != 0x80000000){
     msb++;
  }
  return 31-msb; 
}

/*
   Notes about floating point. We use 8 bits to 
   encode exp is 0xFF = 255. But the calculation is
   power = exp-127. Since we are dealing with integers
   we must keep exp-127 > 0 since 2^power would be less than 
   1 since 2^(-x) equals 1/2^x.  So exp has to be between 127-255.
   If MSB of u is greater than 23 then we are taling about 
   a number greater than 2^24. 
*/
unsigned u2f(unsigned u) {
  unsigned msb;
  unsigned exp;
  unsigned frac;
  unsigned flt;
  
  /* Find MSB. If greater than 23 shift left, else, shift right.
     Move msb to 'hidden' 1.xxx so that rest of 
     fraction is in the fractional place of float.
     ex. if msb = 3 then move everything up 20
     (Same as multiplying by 2^(23-sb))
  */
  msb=31;
  while ((u & (1 << msb)) == 0){
     msb--;
  }
 
  if(msb >= 23){
    frac = u >> (msb - 23); 
  } 
  else {
    frac = u << (23 - msb); 
  }

  /* IEEE 754 says that 2^X where X = exp - 127.
     Example msb = 3 means we need 2^3 = 8.
     Therefore exp = 127 + msb
     So that (exp - 127) = 3 
     Call exp-127 the 'power'
     power = exp = 130-127 = 3.
   */ 
   exp = 127 + msb;

   /* Now move exp up into the place */
   flt = exp << 23; 

   /* Mask off exp bits for when msb >= 23 */
   frac = frac & 0x007FFFFF;

   /* Concatenate exp and frac with bitwise or */
   flt = flt | frac;
   
  return flt;
}

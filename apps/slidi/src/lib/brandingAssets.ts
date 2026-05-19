export interface BrandingLibraryItem {
  filename: string;
  displayName: string;
  category: string;
  url: string;
}

const FILES = [
  "adesso_as_a_service_Black_CMYK(webpng).png",
  "adesso_as_a_service_Black_RGB(webpng).png",
  "adesso_as_a_service_Color_CMYK(webpng).png",
  "adesso_as_a_service_Color_RGB(webpng).png",
  "adesso_as_a_service_White_CMYK(webpng).png",
  "adesso_as_a_service_White_RGB(webpng).png",
  "adesso_banking_solutions_Black_CMYK(webpng).png",
  "adesso_banking_solutions_Black_RGB(webpng).png",
  "adesso_banking_solutions_Color_CMYK(webpng).png",
  "adesso_banking_solutions_Color_RGB(webpng).png",
  "adesso_banking_solutions_White_CMYK(webpng).png",
  "adesso_banking_solutions_White_RGB(webpng).png",
  "adesso_basic_Black_CMYK(webpng).png",
  "adesso_basic_Black_RGB(webpng).png",
  "adesso_basic_Color_CMYK(webpng).png",
  "adesso_basic_Color_RGB(webpng).png",
  "adesso_basic_White_CMYK(webpng).png",
  "adesso_basic_White_RGB(webpng).png",
  "adesso_business_consulting_Black_CMYK(webpng).png",
  "adesso_business_consulting_Black_RGB(webpng).png",
  "adesso_business_consulting_Color_CMYK(webpng).png",
  "adesso_business_consulting_Color_RGB(webpng).png",
  "adesso_business_consulting_White_CMYK(webpng).png",
  "adesso_business_consulting_White_RGB(webpng).png",
  "adesso_group_Black_CMYK(webpng).png",
  "adesso_group_Black_RGB(webpng).png",
  "adesso_group_Color_CMYK(webpng).png",
  "adesso_group_Color_RGB(webpng).png",
  "adesso_group_White_CMYK(webpng).png",
  "adesso_group_White_RGB(webpng).png",
  "adesso_health_solutions_Black_CMYK(webpng).png",
  "adesso_health_solutions_Black_RGB(webpng).png",
  "adesso_health_solutions_Color_CMYK(webpng).png",
  "adesso_health_solutions_Color_RGB(webpng).png",
  "adesso_health_solutions_White_CMYK(webpng).png",
  "adesso_health_solutions_White_RGB(webpng).png",
  "adesso_insurance_solutions_Black_CMYK(webpng).png",
  "adesso_insurance_solutions_Black_RGB(webpng).png",
  "adesso_insurance_solutions_Color_CMYK(webpng).png",
  "adesso_insurance_solutions_Color_RGB(webpng).png",
  "adesso_insurance_solutions_White_CMYK(webpng).png",
  "adesso_insurance_solutions_White_RGB(webpng).png",
  "adesso_manufacturing_industry_solutions_Black_CMYK(webpng).png",
  "adesso_manufacturing_industry_solutions_Color_CMYK(webpng).png",
  "adesso_manufacturing_industry_solutions_Color_RGB(webpng).png",
  "adesso_manufacturing_industry_solutions_RGB(webpng).png",
  "adesso_manufacturing_industry_solutions_White_CMYK(webpng).png",
  "adesso_manufacturing_industry_solutions_White_RGB(webpng).png",
  "adesso_mobile_solutions_Black_CMYK(webpng).png",
  "adesso_mobile_solutions_Black_RGB(webpng).png",
  "adesso_mobile_solutions_Color_CMYK(webpng).png",
  "adesso_mobile_solutions_Color_RGB(webpng).png",
  "adesso_mobile_solutions_White_CMYK(webpng).png",
  "adesso_mobile_solutions_White_RGB(webpng).png",
  "adesso_transformer_Black_CMYK(webpng).png",
  "adesso_transformer_Black_RGB(webpng).png",
  "adesso_transformer_Color_CMYK(webpng).png",
  "adesso_transformer_Color_RGB(webpng).png",
  "adesso_transformer_White_CMYK(webpng).png",
  "adesso_transformer_White_RGB(webpng).png",
  "alleato_Black_CMYK(webpng).png",
  "alleato_Black_RGB(webpng).png",
  "alleato_Color_CMYK(webpng).png",
  "alleato_Color_RGB(webpng).png",
  "alleato_White_RGB(webpng).png",
  "com2m_Black_CMYK(webpng).png",
  "com2m_Black_RGB(webpng).png",
  "com2m_Color_CMYK(webpng).png",
  "com2m_Color_RGB(webpng).png",
  "com2m_White_CMYK(webpng).png",
  "com2m_White_RGB(webpng).png",
  "PBM AG Logo Vektor textNEW(webpng).png",
  "percision_Black_CMYK(webpng).png",
  "percision_Black_RGB(webpng).png",
  "percision_Color_CMYK(webpng).png",
  "percision_Color_RGB(webpng).png",
  "percision_White_CMYK(webpng).png",
  "percision_White_RGB(webpng).png",
  "ue-logo_black_CMYK(webpng).png",
  "ue-logo_black_RGB(webpng) (1).png",
  "ue-logo_black_RGB(webpng).png",
  "ue-logo_Claim_black_CMYK(webpng).png",
  "ue-logo_Claim_black_RGB(webpng) (1).png",
  "ue-logo_Claim_black_RGB(webpng).png",
  "ue-logo_Claim_CMYK_COLOR(webpng) (1).png",
  "ue-logo_Claim_CMYK_COLOR(webpng).png",
  "ue-logo_Claim_color_CMYK(webpng).png",
  "ue-logo_Claim_color_RGB(webpng) (1).png",
  "ue-logo_Claim_color_RGB(webpng).png",
  "ue-logo_Claim_white_CMYK(webpng).png",
  "ue-logo_Claim_white_RGB(webpng) (1).png",
  "ue-logo_Claim_white_RGB(webpng).png",
  "ue-logo_color_CMYK(webpng).png",
  "ue-logo_color_RGB(webpng) (1).png",
  "ue-logo_color_RGB(webpng).png",
  "ue-logo_white_CMYK(webpng).png",
  "ue-logo_white_RGB(webpng) (1).png",
  "ue-logo_white_RGB(webpng).png"
];

export const BRANDING_LIBRARY: BrandingLibraryItem[] = FILES.map(f => {
  let category = "Other";
  if (f.toLowerCase().startsWith("adesso_")) category = "adesso";
  else if (f.toLowerCase().startsWith("ue-")) category = "Urban Energy";
  else if (f.toLowerCase().startsWith("percision_")) category = "Precision";
  else if (f.toLowerCase().startsWith("com2m_")) category = "com2m";
  else if (f.toLowerCase().startsWith("alleato_")) category = "Alleato";
  else if (f.toLowerCase().startsWith("pbm")) category = "Personal Business Machine";
  
  let displayName = f
    .replace(/\(webpng\)/gi, "")
    .replace(/\.png/gi, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\(1\)/g, "")
    .replace(/ue logo/gi, "")
    .replace(/percision/gi, "Precision")
    .replace(/Claim/gi, "")
    .replace(/AG Logo Vektor textNEW/gi, "")
    .replace(/CMYK/gi, "")
    .replace(/COLOR/gi, "")
    .replace(/RGB/gi, "")
    .replace(/  +/g, " ")
    .trim();

  // Special case for adesso to remove the prefix from display name
  if (category === "adesso") displayName = displayName.replace(/^adesso /i, "");
  // Capitalize first letters
  displayName = displayName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  return {
    filename: f,
    displayName,
    category,
    url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/${f}`
  };
});

export const BRANDING_CATEGORIES = Array.from(new Set(BRANDING_LIBRARY.map(i => i.category)));

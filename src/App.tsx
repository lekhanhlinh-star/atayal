import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import styled from 'styled-components';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import SpaIcon from '@mui/icons-material/Spa';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import CoronavirusIcon from '@mui/icons-material/Coronavirus';
import PersonIcon from '@mui/icons-material/Person';
import Collapse from '@mui/material/Collapse';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import CircularProgress from '@mui/material/CircularProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import StopIcon from '@mui/icons-material/Stop';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Import graphics
import medicinalPlantsImg from './assets/圖片1-泰雅族藥用動植物知識 Atayal medicinal plants and animals.png';
import translateChineseImg from './assets/圖片2-華語翻譯成泰雅語 Translate Chinese to Atayal.png';
import translateAtayalImg from './assets/圖片3-泰雅語翻譯成華語 Translate Atayal to Chinese.png';
import transcribeImg from './assets/圖片4-泰雅語音轉文字 Transcribe Atayal speech to text.png';
import learnSentencesImg from './assets/圖片5-學習目標句 Learn Atayal sentences.png';

const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f', // Red color for children
      light: '#ef5350',
      dark: '#c62828',
    },
    secondary: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: '#fff5f5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2D3748',
      secondary: '#4A5568',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      color: '#c62828',
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 600,
      color: '#2D3748',
      letterSpacing: '-0.25px',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

// API endpoints - Currently only 1 API is connected, 3 more need integration
// TODO: Integrate all 4 APIs as mentioned by 範白松
const ASR_API_BASE = '/api/asr';
const TTS_API_BASE = '/api/tts';
const TRANS_API_BASE = '/api/trans';

// Translation APIs
const translateChineseToAtayal = async (text: string): Promise<string> => {
  const url = `${TRANS_API_BASE}/translate/chinese-to-atayal`;
  const body = {
    language_id: 'zh',
    max_length: 128,
    reference_id: `req-${Date.now()}`,
    text,
  };
  // Try direct, then proxies
  const candidates = [
    { url, useProxy: false },
    { url: `https://cors-anywhere.herokuapp.com/${url}`, useProxy: true },
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, useProxy: true },
    { url: `https://thingproxy.freeboard.io/fetch/${url}`, useProxy: true },
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data?.atayal_text === 'string') return data.atayal_text;
      return JSON.stringify(data);
    } catch (e) {
      continue;
    }
  }
  throw new Error('Translation service unreachable (CORS/proxy blocked).');
};

const translateAtayalToChinese = async (text: string): Promise<string> => {
  const url = `${TRANS_API_BASE}/translate/atayal-to-chinese`;
  const body = {
    language_id: 'atayal',
    max_length: 128,
    reference_id: `req-${Date.now()}`,
    text,
  };
  const candidates = [
    { url, useProxy: false },
    { url: `https://cors-anywhere.herokuapp.com/${url}`, useProxy: true },
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, useProxy: true },
    { url: `https://thingproxy.freeboard.io/fetch/${url}`, useProxy: true },
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data?.chinese_text === 'string') return data.chinese_text;
      return JSON.stringify(data);
    } catch (e) {
      continue;
    }
  }
  throw new Error('Translation service unreachable (CORS/proxy blocked).');
};

// API functions - Priority is to ensure system works with any audio input
const uploadAudioForTranscription = async (audioFile: File, targetLanguage: 'chinese' | 'atayal') => {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  // Log FormData contents
  console.log('FormData entries:');
  Array.from(formData.entries()).forEach(([key, value]) => {
    console.log(key, value);
  });
  
  const endpoint = targetLanguage === 'chinese' ? '/to_chinese/' : '/to_atayal/';
  const fullUrl = `${ASR_API_BASE}${endpoint}`;
  
  console.log('Uploading to:', fullUrl);
  console.log('File:', audioFile.name, 'Size:', audioFile.size, 'Type:', audioFile.type);
  
  try {
    // Thử nhiều proxy khác nhau để bypass CORS
    let response;
    let usedProxy = false;
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/',
      null // null means direct request
    ];
    
    for (const proxy of proxies) {
      try {
        if (proxy) {
          console.log('Trying proxy:', proxy);
          const proxyUrl = proxy + (proxy.includes('?') ? encodeURIComponent(fullUrl) : fullUrl);
          response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
            },
            body: formData,
          });
          usedProxy = true;
          console.log('Proxy worked:', proxy);
          break;
        } else {
          console.log('Trying direct request...');
          response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
            },
            body: formData,
          });
          console.log('Direct request worked');
          break;
        }
      } catch (proxyError) {
        const errorMsg = proxyError instanceof Error ? proxyError.message : 'Unknown error';
        console.log('Proxy failed:', proxy, errorMsg);
        continue;
      }
    }
    
    if (!response) {
      throw new Error('All proxies and direct request failed');
    }
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Used proxy:', usedProxy);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
    }
    
    // API trả về text, không phải JSON
    const result = await response.text();
    console.log('API Response:', result);
    
    // Xử lý response text - loại bỏ timestamp nếu có
    if (result) {
      // Nếu response có timestamp format [0.0-4.66s], loại bỏ chúng
      const cleanText = result.replace(/\[\d+\.\d+-\d+\.\d+s\]\s*/g, '').trim();
      console.log('Cleaned text:', cleanText);
      return cleanText || result;
    } else {
      return 'Transcription completed but no text returned';
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Kiểm tra loại lỗi
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    } else if (errorMessage.includes('CORS')) {
      throw new Error('CORS error: Please contact the administrator.');
    } else {
      throw new Error(`Transcription service temporarily unavailable: ${errorMessage}`);
    }
  }
};

const generateSpeech = async (text: string, spkid: number, filename: string) => {
  const params = new URLSearchParams({
    text,
    spkid: spkid.toString(),
    filename,
  });
  
  try {
    const response = await fetch(`${TTS_API_BASE}/inference?${params}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Speech generation failed: ${response.status}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('API Error:', error);
    throw new Error('Speech generation service temporarily unavailable');
  }
};

// TODO: Add integration for the remaining 3 APIs
// - API 2: [To be clarified in tomorrow's meeting]
// - API 3: [To be clarified in tomorrow's meeting] 
// - API 4: [To be clarified in tomorrow's meeting]

// Styled components with red theme
const StyledPaper = styled(Paper)`
  padding: 2.5rem;
  margin: 1.5rem 0;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  background: linear-gradient(145deg, #ffffff, #fff5f5);
  border: 1px solid rgba(239, 83, 80, 0.2);
`;

const SectionBox = styled(Box)`
  margin-bottom: 3rem;
  position: relative;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1.5rem;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, #ef5350, transparent);
  }
  
  &:last-child::after {
    display: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 1.25rem;
  border: 2px solid #ffcdd2;
  border-radius: 12px;
  font-size: 16px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s ease;
  background-color: #FFFFFF;
  color: #2D3748;
  
  &:focus {
    outline: none;
    border-color: #d32f2f;
    box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.15);
  }
  
  &::placeholder {
    color: #A0AEC0;
  }
`;

const UploadButton = styled.label`
  background-color: #f44336;
  color: white;
  border: none;
  padding: 0.875rem 1.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  letter-spacing: 0.3px;
  
  &:hover {
    background-color: #d32f2f;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    font-size: 22px;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background-color: ${props => props.variant === 'secondary' ? '#f44336' : '#d32f2f'};
  color: white;
  border: none;
  padding: 0.875rem 1.75rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  letter-spacing: 0.3px;
  
  &:hover {
    background-color: ${props => props.variant === 'secondary' ? '#d32f2f' : '#c62828'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    font-size: 22px;
  }
`;

const ButtonGroup = styled(Box)`
  display: flex;
  gap: 1rem;
  margin-top: 1.25rem;
  flex-wrap: wrap;
`;

const Header = styled(Box)`
  text-align: center;
  margin-bottom: 3rem;
  padding: 3rem 0;
  background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
  border-radius: 16px;
  color: white;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  }
  
  h1 {
    margin: 0;
    font-size: 2.75rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    position: relative;
  }
  
  p {
    margin: 1rem 0 0;
    opacity: 0.9;
    font-size: 1.2rem;
    position: relative;
  }
`;

const Layout = styled(Box)`
  display: flex;
  min-height: 100vh;
`;

const NavDrawer = styled(Drawer)`
  .MuiDrawer-paper {
    width: 240px;
    background: linear-gradient(180deg, #d32f2f 0%, #c62828 100%);
    color: white;
    border-right: none;
  }
`;

const NavHeader = styled(Box)`
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const NavItem = styled(ListItem)<{ $active?: boolean }>`
  margin: 0.5rem 1rem;
  border-radius: 8px;
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  transition: all 0.2s ease;
  padding: 0.75rem 1rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .MuiListItemIcon-root {
    color: inherit;
    min-width: 40px;
  }
`;

const MainContent = styled(Box)`
  flex: 1;
  padding: 2rem;
  background-color: #fff5f5;
`;

const MenuButton = styled(IconButton)`
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1200;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background: #fff5f5;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  width: 100%;
`;

const HomeNavGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 2.5rem;
  justify-items: center;
  align-items: stretch;
  margin: 3rem auto 0 auto;
  max-width: 900px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    max-width: 600px;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    max-width: 350px;
  }
`;

const HomeNavItem = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2rem 1.5rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
  min-width: 140px;
  min-height: 200px;
  width: 100%;
  position: relative;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 6px 20px rgba(211, 47, 47, 0.15);
    transform: translateY(-4px) scale(1.04);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, transparent 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const HomeNavIcon = styled(Box)`
  font-size: 48px;
  color: #d32f2f;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const HomeNavText = styled(Typography)`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2D3748;
  text-align: center;
  line-height: 1.4;
  position: relative;
  z-index: 1;
`;

const HomeNavImage = styled.img`
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: block;
`;

const BilingualText = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const EnglishText = styled(Typography)`
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
`;

// Navigation data with bilingual support - Updated order
const navItems = [
  { 
    text: '首頁', 
    english: 'Home',
    icon: <HomeIcon />, 
    path: '/'
  },
  { 
    text: '泰雅族藥用動植物知識', 
    english: 'Atayal Medicinal Plants and Animals',
    icon: <LocalFloristIcon />, 
    path: '/medicinal'
  },
  { 
    text: '華語翻譯成泰雅語', 
    english: 'Translate Chinese to Atayal',
    icon: <MicIcon />, 
    path: '/transatayal'
  },
  { 
    text: '泰雅語翻譯成華語', 
    english: 'Translate Atayal to Chinese',
    icon: <VolumeUpIcon />, 
    path: '/transchinese'
  },
  { 
    text: '泰雅語音轉文字', 
    english: 'Transcribe Atayal Speech to Text',
    icon: <AudiotrackIcon />, 
    path: '/transcribe'
  },
  { 
    text: '學習目標句', 
    english: 'Learn Atayal Sentences',
    icon: <MenuBookIcon />, 
    path: '/learning'
  },
];

const homeNavs = [
  {
    icon: <LocalFloristIcon sx={{ fontSize: 48 }} />, 
    text: '藥用動植物', 
    english: 'Medicinal Plants and Animals',
    path: 'https://sites.google.com/view/atayalmedical/home'
  },
  {
    icon: <SpaIcon sx={{ fontSize: 48 }} />, 
    text: '泛靈信仰和醫療', 
    english: 'Animism and Medicine',
    path: 'https://sites.google.com/view/atayalmedical/home'
  },
  {
    icon: <FamilyRestroomIcon sx={{ fontSize: 48 }} />, 
    text: '婚育習俗', 
    english: 'Marriage and Childbirth Customs',
    path: 'https://sites.google.com/view/atayalmedical/home'
  },
  {
    icon: <CoronavirusIcon sx={{ fontSize: 48 }} />, 
    text: '大規模傳染病', 
    english: 'Large-scale Infectious Diseases',
    path: 'https://sites.google.com/view/atayalmedical/home'
  },
  {
    icon: <PersonIcon sx={{ fontSize: 48 }} />, 
    text: '泰雅醫生故事', 
    english: 'Atayal Doctor Stories',
    path: 'https://sites.google.com/view/atayalmedical/home'
  },
];

const Navigation = () => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <>
      <NavHeader>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          泰雅族藥用知識與族語學習AI
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          Atayal Medicinal Knowledge and AI-assisted Language Learning
        </Typography>
      </NavHeader>
      <List>
        {navItems.map((item) => (
          <StyledLink to={item.path} key={item.text} onClick={() => isMobile && handleDrawerToggle()}>
            <NavItem $active={location.pathname === item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                secondary={item.english}
              />
            </NavItem>
          </StyledLink>
        ))}
      </List>
    </>
  );

  return (
    <>
      {isMobile && (
        <MenuButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
        >
          <MenuIcon />
        </MenuButton>
      )}
      <NavDrawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
      >
        {drawerContent}
      </NavDrawer>
    </>
  );
};

const HomePage = () => (
  <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
    {/* Hero Section */}
    <Box sx={{ 
      textAlign: 'center', 
      mb: 6,
      background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
      borderRadius: '24px',
      padding: '4rem 2rem',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
      }} />
      <Typography variant="h2" sx={{ 
        fontWeight: 800, 
        mb: 2, 
        letterSpacing: 3,
        position: 'relative',
        zIndex: 1
      }}>
        泰雅族藥用知識與族語學習AI
      </Typography>
      <Typography variant="h5" sx={{ 
        mb: 0, 
        fontStyle: 'italic',
        opacity: 0.9,
        position: 'relative',
        zIndex: 1
      }}>
        Atayal Medicinal Knowledge and AI-assisted Language Learning
      </Typography>
    </Box>

    {/* Features Section */}
    <Box sx={{ mb: 6, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ 
        fontWeight: 700, 
        mb: 4, 
        color: '#d32f2f', 
        textAlign: 'center',
        position: 'relative'
      }}>
        <Box component="span" sx={{
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '4px',
            background: 'linear-gradient(90deg, #d32f2f, #f44336)',
            borderRadius: '2px'
          }
        }}>
          五大核心功能
        </Box>
      </Typography>
      <Typography variant="h6" sx={{ 
        textAlign: 'center', 
        mb: 4, 
        color: '#666',
        fontStyle: 'italic'
      }}>
        Five Core Functions
      </Typography>
      
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: 3,
        mb: 4,
        maxWidth: '1000px',
        mx: 'auto'
      }}>
        {/* Feature Card 1 */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <LocalFloristIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            藥用動植物知識
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            呈現研究團隊訪談及蒐集整理的泰雅藥用動植物知識
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Present research team interviews and collected Atayal medicinal plant and animal knowledge
          </Typography>
        </StyledPaper>

        {/* Feature Card 2 */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <MicIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            華語→泰雅語翻譯
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            將華語文字或語音翻譯成泰雅語，並可將其內容發音
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Translate Chinese text or speech to Atayal with pronunciation
          </Typography>
        </StyledPaper>

        {/* Feature Card 3 */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <VolumeUpIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            泰雅語→華語翻譯
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            將泰雅語文字或語音翻譯成華語，並可將其內容發音
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Translate Atayal text or speech to Chinese with pronunciation
          </Typography>
        </StyledPaper>

        {/* Feature Card 4 */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <AudiotrackIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            語音轉文字
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            轉譯泰雅語音成泰雅文字
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Transcribe Atayal speech to Atayal text
          </Typography>
        </StyledPaper>

        {/* Feature Card 5 */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <MenuBookIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            學習目標句
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            學習目標句的發音及比對泰雅語音發音的標準程度
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Learn target sentence pronunciation and compare with standard Atayal pronunciation
          </Typography>
        </StyledPaper>

        {/* Target Audience Card */}
        <StyledPaper sx={{ 
          textAlign: 'center', 
          p: 3,
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)',
          border: '2px solid #ffcdd2',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: '0 12px 40px rgba(211, 47, 47, 0.2)'
          }
        }}>
          <PersonIcon sx={{ fontSize: 48, color: '#d32f2f', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            適用對象
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6, mb: 1 }}>
            從幼兒到成人的學習者皆可利用此網頁學習泰雅藥用知識及泰雅語
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
            Learners from children to adults can use this website to learn Atayal medicinal knowledge and language
          </Typography>
        </StyledPaper>
      </Box>
    </Box>

    {/* Research Team Section */}
    <Box sx={{ mb: 6, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ 
        fontWeight: 700, 
        mb: 2, 
        color: '#d32f2f', 
        textAlign: 'center',
        position: 'relative'
      }}>
        <Box component="span" sx={{
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '4px',
            background: 'linear-gradient(90deg, #d32f2f, #f44336)',
            borderRadius: '2px'
          }
        }}>
          研究團隊
        </Box>
      </Typography>
      <Typography variant="h6" sx={{ 
        textAlign: 'center', 
        mb: 4, 
        color: '#666',
        fontStyle: 'italic'
      }}>
        Research Team
      </Typography>

      {/* Funding & PI Section */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        gap: 3,
        mb: 4,
        maxWidth: '800px',
        mx: 'auto'
      }}>
        <StyledPaper sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #d32f2f, #f44336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>💰</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            經費來源 Funding
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#666', mb: 1 }}>
            國科會、文化部
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', mt: 1, fontStyle: 'italic' }}>
            Funding: NSTC, Ministry of Culture
          </Typography>
        </StyledPaper>

        <StyledPaper sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #d32f2f, #f44336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>👨‍🏫</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            計畫主持人 PI
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#666', mb: 1 }}>
            辛靜婷教授
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
            國立清華大學幼兒教育學系
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
            Ching-Ting Hsin, Professor, Dept. of Early Childhood Education, NTHU
          </Typography>
        </StyledPaper>
      </Box>

      {/* Co-PI Section */}
      <StyledPaper sx={{ p: 3, mb: 4, textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 2,
          gap: 2
        }}>
          <Box sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #d32f2f, #f44336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>👨‍💻</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f' }}>
            共同主持人 Co-PI
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#666', mb: 1 }}>
          王家慶特聘教授
        </Typography>
        <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
          國立中央大學資訊工程學系
        </Typography>
        <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
        Jia-Ching Wang, Chair Professor, Dept. of Computer Science and Information Engineering, NCU
        </Typography>
      </StyledPaper>

      {/* Consultants Section */}
      <StyledPaper sx={{ p: 3, mb: 4, textAlign: 'center', maxWidth: '1000px', mx: 'auto' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 3,
          gap: 2
        }}>
          <Box sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #d32f2f, #f44336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>👥</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f' }}>
            顧問團隊 Consultant
          </Typography>
        </Box>
        
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Apang Bway 劉芝芳</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>台灣泰雅族語文學會理事長</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Batu Utaw 姜裕福</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園市復興區比亞外部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Ciwas Behuy 吉娃斯</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉司馬庫斯部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Ciwas Buya 張艾潔</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣竹東鎮族語教師</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Hiri' Bawnay' 張秀英</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣五峰鄉土場部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Kumay Behuy 謝森祿</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣五峰鄉松本部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Lawa Tazil 田玉英</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉馬里光部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Lesa Batu 范坤松</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉比麟部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Masay Sulung 馬賽稣隆</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉司馬庫斯部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Momo Apu 曾冰露</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉嘉樂村耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Sayun Yumin 莎韻尤命</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉司馬庫斯部落族語教師</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Sugiy Tosi 素伊多夕</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園市復興區族語教師</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Tlaw Nayban 張秋生</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣五峰鄉白蘭部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Toyu Watan 林純桂</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園市復興區族語教師</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Upah Neban 羅美秋</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園復興區砂崙子部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Watan Taya 張新仙</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園復興區高義部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Yuhaw Taya 邱勇好</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>桃園市復興區比亞外部落耆老</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>Yumin Hayung 尤命哈用</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>新竹縣尖石鄉馬里光部落耆老</Typography>
          </Box>
        </Box>
      </StyledPaper>

      {/* Research Assistants Section */}
      <StyledPaper sx={{ p: 3, textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 3,
          gap: 2
        }}>
          <Box sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #d32f2f, #f44336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>🔬</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f' }}>
            研究助理 Research Assistants
          </Typography>
        </Box>
        
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
              清華大學
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.8, mb: 1 }}>
              劉以心、江嘉穗、林憫心、邱子耘、邱筠涵、徐億銓、張妤瑄、張譯云、楊又潔、謝家薰
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
              National Tsing Hua University
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
              中央大學
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.8, mb: 1 }}>
              王騰輝、林祐廷、胡峻愷、黃稟智、詹博丞、範白松
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
              National Central University
            </Typography>
          </Box>
        </Box>
      </StyledPaper>
    </Box>
  </Box>
);

const MedicinalPlantsPage = () => (
  <Box sx={{ maxWidth: 900, mx: 'auto', textAlign: 'center', mt: 6 }}>
    {/* Background image container */}
    <Box sx={{ 
      position: 'relative', 
      borderRadius: '20px', 
      overflow: 'hidden',
      mb: 4,
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Background image */}
      <img 
        src={medicinalPlantsImg} 
        alt="泰雅族藥用動植物知識"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1
        }}
      />
      {/* Dark overlay for better text readability */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 2
      }} />
      {/* Text content */}
      <Box sx={{ position: 'relative', zIndex: 3, color: '#FFD700', p: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
          泰雅族藥用動植物知識
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, fontStyle: 'italic', color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
          Atayal Medicinal Plants and Animals
        </Typography>
      </Box>
    </Box>
    
    {/* External link button */}
    <Box sx={{ mt: 4 }}>
      <ActionButton 
        onClick={() => window.open('https://sites.google.com/view/atayalmedical/home', '_blank')}
        style={{ 
          fontSize: '1.1rem', 
          padding: '1rem 2rem',
          background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)'
        }}
      >
        <LocalFloristIcon sx={{ mr: 1 }} />
        了解更多藥用動植物知識
        <br />
        <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
          Learn More About Medicinal Plants and Animals
        </span>
      </ActionButton>
    </Box>
  </Box>
);

const FaithMedicalPage = () => <Box sx={{ mt: 6, textAlign: 'center' }}><Typography variant="h4">泛靈信仰和醫療</Typography></Box>;
const MarriageCustomsPage = () => <Box sx={{ mt: 6, textAlign: 'center' }}><Typography variant="h4">婚育習俗</Typography></Box>;
const EpidemicPage = () => <Box sx={{ mt: 6, textAlign: 'center' }}><Typography variant="h4">大規模傳染病</Typography></Box>;
const DoctorStoryPage = () => <Box sx={{ mt: 6, textAlign: 'center' }}><Typography variant="h4">泰雅醫生故事</Typography></Box>;

const TranslationLayout = styled(Box)`
  display: flex;
  flex-direction: row;
  gap: 2rem;
  justify-content: center;
  align-items: flex-start;
  margin-top: 2rem;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const TranslationBox = styled(Paper)`
  flex: 1;
  padding: 2rem 1.5rem;
  border-radius: 14px;
  min-width: 320px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const OutputAudioBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const ProcessButton = styled.button`
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
  &:hover {
    background: #c62828;
  }
`;

const AudioInputBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const RecordButton = styled(ProcessButton)<{ recording?: boolean }>`
  background: ${props => props.recording ? '#e53935' : '#d32f2f'};
  &:hover {
    background: ${props => props.recording ? '#b71c1c' : '#c62828'};
  }
`;

const LearningGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-top: 2.5rem;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const GridCol = styled(Box)`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const GridRow = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80px;
`;

const AtayalText = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: #d32f2f;
  margin-bottom: 0.5rem;
`;

const PhoneticText = styled.div`
  font-size: 1rem;
  color: #37474f;
  margin-bottom: 0.5rem;
`;

const AudioButton = styled.button`
  background: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  margin: 0.25rem 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s;
  &:hover {
    background: #d32f2f;
  }
`;

const CompareResult = styled.div<{ correct?: boolean }>`
  font-weight: 600;
  color: ${props => props.correct ? '#4caf50' : '#e53935'};
  margin-top: 1rem;
`;

// Dữ liệu mẫu cho 4 câu học
const learningData = [
  { atayal: 'mita', phonetic: 'mi-ta', audio1: '', audio2: '', compare: '100%' },
  { atayal: 'squliq', phonetic: 'su-liq', audio1: '', audio2: '', compare: '75%' },
  { atayal: 'yutas', phonetic: 'yu-tas', audio1: '', audio2: '', compare: '80%' },
  { atayal: 'patas', phonetic: 'pa-tas', audio1: '', audio2: '', compare: '40%' },
];

const LearningPage = () => {
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const lastUrlRef = React.useRef<string | null>(null);

  const cleanupAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    } catch {}
    if (lastUrlRef.current) {
      try { URL.revokeObjectURL(lastUrlRef.current); } catch {}
      lastUrlRef.current = null;
    }
  };

  const handleListen = async (rowIndex: number, voice: 'male' | 'female') => {
    if (loadingKey) return;
    const key = `${rowIndex}-${voice}`;
    setLoadingKey(key);
    try {
      const text = learningData[rowIndex].atayal;
      const spkid = voice === 'female' ? 0 : 1; // female=0, male=1
      const blob = await generateSpeech(text, spkid, `learn_${rowIndex}`);
      const url = URL.createObjectURL(blob);
      cleanupAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      lastUrlRef.current = url;
      audio.onended = () => {
        cleanupAudio();
        setLoadingKey(null);
      };
      await audio.play();
      setLoadingKey(null);
    } catch (err) {
      console.error('Listen failed', err);
      setLoadingKey(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      {/* Background image container */}
      <Box sx={{ 
        position: 'relative', 
        borderRadius: '20px', 
        overflow: 'hidden',
        mb: 4,
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background image */}
        <img 
          src={learnSentencesImg} 
          alt="學習目標句"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        {/* Dark overlay for better text readability */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 2
        }} />
        {/* Text content */}
        <Box sx={{ position: 'relative', zIndex: 3, color: '#FFD700', p: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
          學習目標句
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, fontStyle: 'italic', color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
          Learn Atayal Sentences
        </Typography>
        </Box>
      </Box>
      
      <LearningGrid>
        {/* Cột 1: Learning Sentences */}
        <GridCol>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>Learning Sentences</Typography>
          {learningData.map((item, idx) => (
            <GridRow key={idx}>
              <PhoneticText>{item.phonetic}</PhoneticText>
              <AtayalText>{item.atayal}</AtayalText>
            </GridRow>
          ))}
        </GridCol>
        {/* Cột 2: Listen */}
        <GridCol>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>Listen</Typography>
          {learningData.map((item, idx) => (
            <GridRow key={idx}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <AudioButton
                  style={{ padding: '0.5rem 0.9rem' }}
                  onClick={() => handleListen(idx, 'male')}
                  disabled={!!loadingKey}
                  title="Listen (male)"
                >
                  {loadingKey === `${idx}-male` ? <CircularProgress size={18} color="inherit" /> : <VolumeUpIcon />}
                  <MaleIcon />
                </AudioButton>
                <AudioButton
                  style={{ padding: '0.5rem 0.9rem' }}
                  onClick={() => handleListen(idx, 'female')}
                  disabled={!!loadingKey}
                  title="Listen (female)"
                >
                  {loadingKey === `${idx}-female` ? <CircularProgress size={18} color="inherit" /> : <VolumeUpIcon />}
                  <FemaleIcon />
                </AudioButton>
              </Box>
            </GridRow>
          ))}
        </GridCol>
        {/* Cột 3: Try to speak */}
        <GridCol>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>Try to speak</Typography>
          {learningData.map((item, idx) => (
            <GridRow key={idx}>
              {/* Sau này sẽ tích hợp ghi âm và gửi lên server để kiểm tra phát âm */}
              <RecordButton style={{ minWidth: 120 }}>
                <MicIcon /> Record
              </RecordButton>
            </GridRow>
          ))}
        </GridCol>
        {/* Cột 4: Compare */}
        <GridCol>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>Compare</Typography>
          {learningData.map((item, idx) => (
            <GridRow key={idx}>
              <CompareResult correct={parseInt(item.compare) >= 75}>{item.compare}</CompareResult>
            </GridRow>
          ))}
        </GridCol>
      </LearningGrid>
    </Box>
  );
};

const TranslationPage = ({
  title,
  englishTitle,
  inputPlaceholder,
  outputPlaceholder,
  inputLangLabel,
  outputLangLabel,
  targetLanguage
}: {
  title: string;
  englishTitle: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
  inputLangLabel: string;
  outputLangLabel: string;
  targetLanguage: 'chinese' | 'atayal';
}) => {
  const [inputText, setInputText] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [outputText, setOutputText] = React.useState('');
  const [voice, setVoice] = React.useState<'male' | 'female'>('male');
  const [ttsLoading, setTtsLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) {
      alert('Please enter text to translate');
      return;
    }

    setProcessing(true);
    try {
      let translated = '';
      if (targetLanguage === 'atayal') {
        translated = await translateChineseToAtayal(inputText);
      } else {
        translated = await translateAtayalToChinese(inputText);
      }
      setProcessing(false);
      setOutputText(translated || '');
    } catch (err) {
      setProcessing(false);
      setOutputText('Translation failed. Please try again.');
    }
  };

  const handlePlayAudio = async () => {
    if (!outputText || ttsLoading) return;
    try {
      setTtsLoading(true);
      const spkid = voice === 'female' ? 0 : 1; // female=0, male=1
      const blob = await generateSpeech(outputText, spkid, 'test');
      const url = URL.createObjectURL(blob);
      // Cleanup previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTtsLoading(false);
      };
      await audio.play();
      setTtsLoading(false);
    } catch (err) {
      setTtsLoading(false);
      console.error('TTS play failed:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <StyledPaper>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#d32f2f', textAlign: 'center' }}>
          文字翻譯
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: '#666' }}>
          Text Translation
        </Typography>
        
        {/* Input Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            {inputLangLabel}
          </Typography>
          <TextArea
            placeholder={inputPlaceholder}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={processing}
            style={{ minHeight: '120px' }}
          />
        </Box>
        
        {/* Translate Button */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <ProcessButton onClick={handleProcess} disabled={processing || !inputText.trim()}>
            {processing && <CircularProgress size={20} color="inherit" />} 
            開始翻譯 Start Translation
          </ProcessButton>
        </Box>
        
        {/* Output Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
            {outputLangLabel}
          </Typography>
          <TextArea
            placeholder={outputPlaceholder}
            value={outputText}
            readOnly
            style={{ minHeight: '120px' }}
          />
        </Box>

        {/* Voice Selection and Audio Output */}
        {outputText && (
          <Box>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Voice Selection</FormLabel>
              <RadioGroup
                row
                value={voice}
                onChange={e => setVoice(e.target.value as 'male' | 'female')}
              >
                <FormControlLabel value="male" control={<Radio />} label={<MaleIcon />} />
                <FormControlLabel value="female" control={<Radio />} label={<FemaleIcon />} />
              </RadioGroup>
            </FormControl>
            
            <OutputAudioBox>
              <ProcessButton 
                onClick={handlePlayAudio}
                disabled={ttsLoading || !outputText}
                style={{ background: '#f44336', minWidth: 48, padding: '0.5rem 1.2rem' }}
              >
                {ttsLoading ? <CircularProgress size={20} color="inherit" /> : <VolumeUpIcon />}
              </ProcessButton>
              <Typography variant="body2">Play output audio</Typography>
            </OutputAudioBox>
          </Box>
        )}
      </StyledPaper>
    </Box>
  );
};

const ASRPage = () => {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      {/* Background image container */}
      <Box sx={{ 
        position: 'relative', 
        borderRadius: '20px', 
        overflow: 'hidden',
        mb: 4,
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background image */}
        <img 
          src={translateChineseImg} 
          alt="華語翻譯成泰雅語"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        {/* Dark overlay for better text readability */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 2
        }} />
        {/* Text content */}
        <Box sx={{ position: 'relative', zIndex: 3, color: '#FFD700', p: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>       
        華語翻譯成泰雅語
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, fontStyle: 'italic', color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
        Translate Chinese to Atayal
        </Typography>
        </Box>
      </Box>
      
      <TranslationPage
        title=""
        englishTitle=""
        inputPlaceholder="Enter Chinese text or upload audio file..."
        outputPlaceholder="Atayal translation will appear here..."
        inputLangLabel="Chinese Input"
        outputLangLabel="Atayal Output"
        targetLanguage="atayal"
      />
    </Box>
  );
};

const TTSPage = () => {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      {/* Background image container */}
      <Box sx={{ 
        position: 'relative', 
        borderRadius: '20px', 
        overflow: 'hidden',
        mb: 4,
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background image */}
        <img 
          src={translateAtayalImg} 
          alt="泰雅語翻譯成華語"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        {/* Dark overlay for better text readability */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 2
        }} />
        {/* Text content */}
        <Box sx={{ position: 'relative', zIndex: 3, color: '#FFD700', p: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
          泰雅語翻譯成華語
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, fontStyle: 'italic', color: '#FFA500', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
          Translate Atayal to Chinese
        </Typography>
        </Box>
      </Box>
      
      <TranslationPage
        title=""
        englishTitle=""
        inputPlaceholder="Enter Atayal text or upload audio file..."
        outputPlaceholder="Chinese translation will appear here..."
        inputLangLabel="Atayal Input"
        outputLangLabel="Chinese Output"
        targetLanguage="chinese"
      />
    </Box>
  );
};

const TranscribePage = () => {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      {/* Background image container */}
      <Box sx={{ 
        position: 'relative', 
        borderRadius: '20px', 
        overflow: 'hidden',
        mb: 4,
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background image */}
        <img 
          src={transcribeImg} 
          alt="泰雅語音轉文字"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        {/* Dark overlay for better text readability */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 2
        }} />
        {/* Text content */}
        <Box sx={{ position: 'relative', zIndex: 3, color: '#FFD700', p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            泰雅語音轉文字
          </Typography>
          <Typography variant="h6" sx={{ fontStyle: 'italic', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
            Transcribe Atayal Speech to Text
          </Typography>
        </Box>
      </Box>
      
      {/* Simplified transcription interface */}
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <StyledPaper>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: '#d32f2f', textAlign: 'center' }}>
            上傳音檔進行轉錄
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: '#666' }}>
            Upload Audio File for Transcription
          </Typography>
          
          {/* Audio Upload Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
              音檔上傳 Audio Upload
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
              支援格式：WAV, MP3, M4A 等音檔格式
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
              Supported formats: WAV, MP3, M4A and other audio formats
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <input
                accept="audio/*"
                style={{ display: 'none' }}
                id="transcribe-audio-upload"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    // Handle file upload logic here
                    console.log('Audio file selected:', file.name);
                  }
                }}
              />
              <UploadButton htmlFor="transcribe-audio-upload">
                <AudiotrackIcon /> 選擇音檔 Choose Audio File
              </UploadButton>
            </Box>
          </Box>
          
          {/* Process Button */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <ProcessButton>
              <AudiotrackIcon /> 開始轉錄 Start Transcription
            </ProcessButton>
          </Box>
          
          {/* Output Section */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#d32f2f' }}>
              轉錄結果 Transcription Result
            </Typography>
            <TextArea
              placeholder="轉錄結果將顯示在這裡... / Transcription result will appear here..."
              readOnly
              style={{ minHeight: '120px' }}
            />
          </Box>
        </StyledPaper>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Navigation />
          <MainContent>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/medicinal" element={<MedicinalPlantsPage />} />
              <Route path="/transatayal" element={<ASRPage />} />
              <Route path="/transchinese" element={<TTSPage />} />
              <Route path="/transcribe" element={<TranscribePage />} />
              <Route path="/learning" element={<LearningPage />} />
            </Routes>
          </MainContent>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;

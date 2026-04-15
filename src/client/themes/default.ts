export const defaultTheme = {
  colors: {
    primary: 'cyan',
    secondary: 'yellow',
    success: 'green',
    danger: 'red',
    warning: 'orange',
    info: 'blue',
    muted: 'gray',
    text: 'white',
    background: 'black',
    border: 'gray',
    highlight: 'magenta',
    accent: 'brightCyan',
    dimmed: 'blackBright',
  },
  
  styles: {
    header: {
      color: 'cyan',
      bold: true,
    },
    
    title: {
      color: 'cyan',
      bold: true,
    },
    
    subtitle: {
      color: 'yellow',
    },
    
    description: {
      color: 'white',
    },
    
    metadata: {
      color: 'gray',
    },
    
    selected: {
      color: 'brightCyan',
      bold: true,
    },
    
    selectedBackground: {
      backgroundColor: 'blackBright',
    },
    
    input: {
      color: 'green',
    },
    
    inputFocused: {
      color: 'brightGreen',
      bold: true,
    },
    
    cursor: {
      color: 'white',
      backgroundColor: 'gray',
    },
    
    error: {
      color: 'red',
      bold: true,
    },
    
    warning: {
      color: 'yellow',
      bold: true,
    },
    
    success: {
      color: 'green',
      bold: true,
    },
    
    loading: {
      color: 'cyan',
    },
    
    help: {
      color: 'gray',
      dimColor: true,
    },
    
    interactive: {
      color: 'cyan',
      underline: true,
    },
    
    badge: {
      color: 'black',
      backgroundColor: 'yellow',
      bold: true,
    },
  },
  
  borders: {
    single: 'single',
    double: 'double',
    round: 'round',
    bold: 'bold',
    singleDouble: 'singleDouble',
    doubleSingle: 'doubleSingle',
    classic: 'classic',
  },
  
  spacing: {
    none: 0,
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
    xxl: 6,
  },
  
  animation: {
    fast: 100,
    normal: 200,
    slow: 500,
    verySlow: 1000,
  },
  
  layout: {
    maxWidth: 120,
    minWidth: 40,
    sidebarWidth: 30,
    headerHeight: 3,
    footerHeight: 2,
  },
} as const;

export type Theme = typeof defaultTheme;
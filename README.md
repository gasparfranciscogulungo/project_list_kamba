# List Kamba 🇦🇴

**Progressive Web App de Gestão de Tarefas para Angola**

List Kamba é uma aplicação web progressiva (PWA) moderna e profissional, especialmente desenvolvida para usuários angolanos. Combina simplicidade visual com funcionalidades robustas, oferecendo uma experiência única e autenticamente local.

![Dashboard](https://github.com/user-attachments/assets/b429d19c-7de7-437d-bfe8-c365027ee0b3)

## ✨ Funcionalidades Principais

### 🎯 Core Features
- **📱 Gestão de Tarefas Offline**: CRUD completo sem necessidade de internet
- **📅 Calendário Integrado**: Visualização mensal/semanal de compromissos
- **🔔 Sistema de Notificações**: Lembretes inteligentes e personalizáveis
- **⏰ Cronômetro Pomodoro**: Técnica de produtividade integrada
- **📊 Analytics Pessoais**: Relatórios de produtividade e estatísticas
- **💾 Backup/Restore**: Sistema de backup local e exportação
- **🌙 Temas Dinâmicos**: Modo claro/escuro com transições suaves

### 🇦🇴 Adaptações para Angola
- **Interface em português (Angola)** com terminologias locais
- **Formato de data DD/MM/YYYY** e hora 24h
- **Feriados nacionais** de Angola integrados
- **Categorias locais** (Família, Comunidade, Negócios)
- **Cores da bandeira angolana** (azul, vermelho, dourado)
- **Otimização para dispositivos populares** em Angola
- **Funcionamento offline robusto** considerando conectividade limitada

![Dark Theme](https://github.com/user-attachments/assets/c875bb4d-e78b-4796-9043-14b5f6958eb6)

## 🛠️ Tecnologias Utilizadas

- **HTML5** semântico e acessível
- **CSS3** moderno (Grid, Flexbox, Custom Properties)
- **JavaScript ES6+** (Modules, Async/Await, Classes)
- **Web APIs nativas** (Notification, Storage, Service Worker)
- **IndexedDB + localStorage** para armazenamento híbrido
- **Service Worker** para funcionalidade PWA completa

## 🚀 Como Usar

### Instalação Local
```bash
# Clone o repositório
git clone https://github.com/gasparfranciscogulungo/project_list_kamba.git

# Entre no diretório
cd project_list_kamba

# Sirva os arquivos com qualquer servidor HTTP
python3 -m http.server 8000
# ou
npx serve .
# ou
php -S localhost:8000
```

### Acesso
1. Abra `http://localhost:8000` no navegador
2. Para instalar como PWA, clique no botão "Instalar App" 
3. O aplicativo funcionará offline após a primeira visita

## 📱 Progressive Web App

O List Kamba é um PWA completo que oferece:

- ✅ **Instalação nativa** no dispositivo
- ✅ **Funcionamento offline** completo
- ✅ **Background sync** quando online
- ✅ **Push notifications** (opcional)
- ✅ **Atalhos de ações rápidas**
- ✅ **Integração com sistema operacional**

## 🎨 Design Angola-First

### Paleta de Cores
- **Azul primário**: `#2F5F8F` (inspirado na bandeira)
- **Azul escuro**: `#0F2027` (modo escuro)
- **Dourado**: `#FFD700` (bandeira de Angola)
- **Vermelho**: `#CE1126` (bandeira de Angola)

### Características Visuais
- Interface limpa inspirada na estética africana moderna
- Tipografia clara sem dependência de fontes externas
- Elementos visuais que remetem à cultura angolana
- Design responsivo otimizado para dispositivos populares

## 📊 Funcionalidades Detalhadas

### Dashboard Inteligente
- Resumo diário de tarefas
- Gráfico de produtividade semanal
- Próximos compromissos
- Atalhos rápidos para ações frequentes

### Gestão de Tarefas Avançada
- Categorias customizáveis (Trabalho, Pessoal, Família, etc.)
- Prioridades visuais (Alta, Média, Baixa)
- Subtarefas e dependências
- Anexos e notas
- Histórico de alterações
- Busca inteligente e filtros

### Sistema de Produtividade
- Técnica Pomodoro (25min trabalho + 5min pausa)
- Cronômetro livre para atividades
- Métricas de tempo dedicado por categoria
- Metas diárias e semanais
- Streaks de produtividade

## ⌨️ Atalhos de Teclado

- `Ctrl/Cmd + N` - Nova tarefa
- `Ctrl/Cmd + 1` - Dashboard
- `Ctrl/Cmd + 2` - Tarefas
- `Ctrl/Cmd + 3` - Calendário
- `Ctrl/Cmd + 4` - Cronômetro
- `Ctrl/Cmd + 5` - Estatísticas
- `Ctrl/Cmd + ,` - Configurações
- `Escape` - Fechar modal
- `?` - Mostrar atalhos

## 🔧 Configurações

### Temas
- **Claro**: Interface clara e clean
- **Escuro**: Modo escuro com tons azuis
- **Automático**: Segue preferência do sistema

### Notificações
- Lembretes de tarefas vencendo
- Notificações de Pomodoro
- Resumos diários
- Modo "Não Perturbar"

## 📈 Analytics e Relatórios

- Tarefas completadas por período
- Tempo médio por tarefa
- Categorias mais utilizadas
- Padrões de produtividade
- Gráficos visuais interativos

## 🔒 Privacidade e Segurança

- **Dados locais**: Tudo fica no seu dispositivo
- **Zero tracking**: Nenhum dado é enviado para servidores
- **Validação de entrada**: Proteção contra XSS
- **Sanitização de dados**: Inputs seguros
- **Backup local**: Controle total dos seus dados

## 🌍 Suporte a Idiomas

- Português (Angola) - Principal
- Suporte a caracteres especiais
- Terminologias locais
- Formatação regional (datas, números)

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Dispositivos
- Desktop (Windows, macOS, Linux)
- Mobile (Android, iOS)
- Tablets
- Otimizado para dispositivos de baixo custo
- link em deploy:  https://gasparfranciscogulungo.github.io/project_list_kamba/

## 🤝 Contribuição

Este projeto é open source! Contribuições são bem-vindas:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

Desenvolvido com ❤️ para a comunidade angolana, promovendo produtividade e organização através da tecnologia.

---

**List Kamba** - *Organize suas tarefas com estilo angolano!* 🇦🇴 

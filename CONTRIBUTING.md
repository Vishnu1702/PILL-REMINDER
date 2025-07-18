# Contributing to MyMedAlert

Thank you for considering contributing to MyMedAlert! This guide will help you get started with contributing to our privacy-focused medicine reminder app.

## 🌟 Ways to Contribute

- **Bug Reports**: Found a bug? Help us fix it!
- **Feature Requests**: Have an idea? We'd love to hear it!
- **Code Contributions**: Submit pull requests for fixes or features
- **Documentation**: Improve our docs and guides
- **Testing**: Help us test new features and platforms
- **Privacy Review**: Help us maintain our privacy-first approach

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/PILL-REMINDER.git
   cd PILL-REMINDER
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 📋 Development Guidelines

### Code Style

- Use functional React components with hooks
- Follow ESLint configuration
- Use Tailwind CSS for styling
- Write descriptive commit messages
- Add comments for complex logic

### Privacy Guidelines

- **No external data transmission**: All data must stay local
- **No third-party analytics**: No tracking or analytics SDKs
- **Local storage only**: Use browser localStorage or device storage
- **No personal data collection**: Avoid collecting identifying information

### Testing

- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (Android, iOS)
- Verify notification functionality
- Test offline functionality

## 🐛 Bug Reports

When reporting bugs, please include:

- **Platform**: Web, Android, or iOS
- **Device/Browser**: Specific device and version
- **Steps to reproduce**: Clear step-by-step instructions
- **Expected vs actual behavior**: What should happen vs what happens
- **Screenshots**: If applicable
- **Privacy note**: Don't include personal health information

## 💡 Feature Requests

When suggesting features:

- **Use case**: Describe the specific scenario
- **Platform priority**: Which platforms need this feature
- **Privacy impact**: How it aligns with our privacy-first approach
- **Implementation complexity**: Your assessment of difficulty

## 🔄 Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding guidelines
   - Add comments for complex logic
   - Ensure privacy compliance

3. **Test Thoroughly**
   - Test on web and mobile
   - Verify all functionality works
   - Check for any data leaks

4. **Commit Changes**
   ```bash
   git commit -m "Add: descriptive commit message"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Submit Pull Request**
   - Use descriptive title and description
   - Reference any related issues
   - Include testing notes

## 📱 Platform-Specific Guidelines

### Web Development
- Ensure responsive design (mobile-first)
- Test on major browsers
- Verify PWA functionality

### Android Development
- Test on multiple Android versions (API 24+)
- Verify notification permissions
- Test on different screen sizes

### iOS Development
- Follow iOS design guidelines
- Test notification functionality
- Verify App Store compliance

## 🔒 Privacy and Security

Our app is built with privacy-by-design principles:

- **No cloud storage**: All data stays on the user's device
- **No tracking**: No analytics or usage tracking
- **Local notifications**: All reminders are device-local
- **No personal data**: We don't collect identifying information

When contributing, ensure your changes maintain these principles.

## 📞 Getting Help

- **Email**: balivishnu.cs@gmail.com
- **GitHub Issues**: For technical discussions
- **GitHub Discussions**: For general questions

## 🏷️ Commit Message Format

Use clear, descriptive commit messages:

```
Add: New feature description
Fix: Bug fix description  
Update: Changes to existing feature
Remove: Removal of feature/code
Docs: Documentation changes
Style: CSS/styling changes
Refactor: Code restructuring
Test: Testing-related changes
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes (for significant contributions)
- Special thanks in documentation

---

Thank you for helping make MyMedAlert better while maintaining our commitment to user privacy! 🚀

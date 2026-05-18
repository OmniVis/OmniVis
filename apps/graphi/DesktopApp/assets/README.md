# Installer Branding Assets

Put your custom installer images here to personalize the Windows setup wizard.

### Recommended Dimensions:

- **installerSidebar.bmp**: 164 x 314 pixels
- **installerHeader.bmp**: 150 x 57 pixels
- **installerIcon.ico**: 256 x 256 pixels (Standard Icon)

### How to use:

In `package.json`, under the `"nsis"` section, reference these files:

```json
"nsis": {
  "oneClick": false,
  "installerSidebar": "assets/installer-sidebar.bmp",
  "installerHeader": "assets/installer-header.bmp"
}
```

_Note: If you use the "One-Click" installer (oneClick: true), these images will NOT be shown as there is no wizard interface._

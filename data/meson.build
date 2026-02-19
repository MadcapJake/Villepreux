desktop_file = i18n.merge_file(
  input: 'com.github.madcapjake.Villepreux.desktop.in',
  output: 'com.github.madcapjake.Villepreux.desktop',
  type: 'desktop',
  po_dir: '../po',
  install: true,
  install_dir: join_paths(get_option('datadir'), 'applications')
)

appstream_file = i18n.merge_file(
  input: 'com.github.madcapjake.Villepreux.appdata.xml.in',
  output: 'com.github.madcapjake.Villepreux.appdata.xml',
  po_dir: '../po',
  install: true,
  install_dir: join_paths(get_option('datadir'), 'metainfo')
)

install_data(
  'com.github.madcapjake.Villepreux.gschema.xml',
  install_dir: join_paths(get_option('datadir'), 'glib-2.0/schemas')
)

# Install icons
install_data(
  'villepreux_icon_128.png',
  install_dir: join_paths(get_option('datadir'), 'icons/hicolor/128x128/apps'),
  rename: 'com.github.madcapjake.Villepreux.png'
)

install_data(
  'villepreux_icon_256.png',
  install_dir: join_paths(get_option('datadir'), 'icons/hicolor/256x256/apps'),
  rename: 'com.github.madcapjake.Villepreux.png'
)

install_data(
  'villepreux_icon_512.png',
  install_dir: join_paths(get_option('datadir'), 'icons/hicolor/512x512/apps'),
  rename: 'com.github.madcapjake.Villepreux.png'
)

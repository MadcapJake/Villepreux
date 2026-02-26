project_sources = [
  'main.js',
  'window.js',
  'database.js',
  'NotificationService.js',
  'utils/image_handler.js',
  'views/EditTankDialog.js',
  'views/DuplicateTankDialog.js',
  'views/LivestockUpdateDialog.js',
  'views/MoveLivestockDialog.js',
]

project_resources = gnome.compile_resources(
  'villepreux',
  'villepreux.gresource.xml',
  source_dir: '.',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir
)

# Install source files
install_data(project_sources, install_dir: moduledir)

# Install scalable symbolic icon
install_data(
  'icons/scalable/apps/villepreux-symbolic.svg',
  install_dir: join_paths(get_option('datadir'), 'icons/hicolor/scalable/apps'),
  rename: 'io.github.madcapjake.Villepreux-symbolic.svg'
)

# Install notification category icons for GNOME Shell (needs AppID prefix to escape sandbox)
notification_icons = [
  'wrench-wide-symbolic.svg',
  'drinking-fountain-symbolic.svg',
  'pharmacy-symbolic.svg',
  'restaurant-symbolic.svg',
  'seal-symbolic.svg'
]

foreach icon_name : notification_icons
  install_data(
    join_paths('icons/scalable/actions', icon_name),
    install_dir: join_paths(get_option('datadir'), 'icons/hicolor/scalable/actions'),
    rename: 'io.github.madcapjake.Villepreux-' + icon_name
  )
endforeach

# Create the executable script
conf = configuration_data()
conf.set('GJS', find_program('gjs').full_path())
conf.set('PACKAGE_VERSION', meson.project_version())
conf.set('PACKAGE_NAME', meson.project_name())
conf.set('prefix', get_option('prefix'))
conf.set('libdir', join_paths(get_option('prefix'), get_option('libdir')))
conf.set('pkgdatadir', pkgdatadir)
conf.set('app_id', base_id)

configure_file(
  input: 'villepreux.in',
  output: 'villepreux',
  configuration: conf,
  install: true,
  install_dir: get_option('bindir'),
  install_mode: 'rwxr-xr-x'
)

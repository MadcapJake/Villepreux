project_sources = [
  'main.js',
  'window.js',
  'database.js',
  'views/AddTankDialog.js',
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

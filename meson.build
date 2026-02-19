project('villepreux', 'c',
  version: '0.1.0',
  meson_version: '>= 0.62.0',
  default_options: [ 'warning_level=2', 'werror=false', ],
)

i18n = import('i18n')
gnome = import('gnome')

dependency('glib-2.0', version: '>= 2.66')
dependency('gio-2.0', version: '>= 2.66')
dependency('gobject-introspection-1.0', version: '>= 1.35.9')
dependency('gtk4', version: '>= 4.10.0')
dependency('libadwaita-1', version: '>= 1.4.0')

base_id = 'com.github.madcapjake.Villepreux'

pkgdatadir = join_paths(get_option('prefix'), get_option('datadir'), meson.project_name())
moduledir = join_paths(pkgdatadir, 'src')

gnome = import('gnome')

subdir('data')
subdir('src')
subdir('po')

gnome.post_install(
  glib_compile_schemas: true,
  gtk_update_icon_cache: true,
  update_desktop_database: true,
)

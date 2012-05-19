require 'sprockets'
require 'sprockets-sass'
require 'sass'
require 'uglifier'

task :default => [:build]

task :build => :clean do
  ENV['image_path'] ||= ''

  # Used by image-url in sass
  def image_path(image, options={})
    image_path = ENV['image_path'].dup
    image_path << '/' unless image_path =~ /(\/$)|(^$)/
    image_path = '../' if image_path == ''
    "#{image_path}#{image}"
  end
  public :image_path

  environment = Sprockets::Environment.new
  environment.append_path('.')
  environment.append_path('vendor')
  environment.append_path('stylesheets')

  assets = environment.find_asset('flame.js')
  assets.write_to('build/flame.js')

  flame = File.open('build/flame.min.js', 'w')
  flame.write(Uglifier.compile(File.read('build/flame.js').gsub(%r{^(\s)+(?:ember|sc)_assert\((.*)\).*$}, '')))
  flame.close

  html5 = environment.find_asset('html5.js')
  html5.write_to('build/html5.js')

  # Flame Inspector
  inspector_js = environment.find_asset('flame_inspector.js')
  inspector_js.write_to('build/flame_inspector.js')
  inspector_css = environment.find_asset('flame_inspector.css.scss')
  inspector_css.write_to('build/stylesheets/flame_inspector.css')

  # SCSS files
  css = environment.find_asset('flame.css.scss')
  css.write_to('build/stylesheets/flame.css')

  # Copy over images directory
  FileUtils.copy_entry('images', 'build/images')
end

task :clean do
  FileUtils.rm_rf('build')
end

task :jshint do
  files = Rake::FileList.new('**/*.js').
      exclude('build/**/*.js').
      exclude('vendor/**/*.js')

  sh "jshint #{files.join(' ')}" do |ok, res|
    fail 'JSHint found errors.' unless ok
  end
end

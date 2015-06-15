require 'sprockets'
require 'sprockets-sass'
require 'sass'
require 'uglifier'
require 'cssminify'

task :default => [:build]

desc 'Concatenate and minify javascript files, compile scss files'
task :build => :clean do
  ENV['image_path'] ||= ''

  # Used by image-url in sass
  def image_path(image, options = {})
    image_path = ENV['image_path'].dup
    image_path << '/' unless image_path =~ /(\/$)|(^$)/
    image_path = '../' if image_path == ''
    "#{image_path}#{image}"
  end
  public :image_path

  environment = Sprockets::Environment.new
  environment.append_path('.')
  environment.append_path('stylesheets')

  environment.register_postprocessor('application/javascript', :anon_wrap) do |_, data|
    "(function() {\n'use strict';\n\n#{data}\n})();\n"
  end

  assets = environment.find_asset('flame.js')
  assets.write_to('build/flame.debug.js')

  flame_prod = File.open('build/flame.prod.js', 'w')
  flame_prod.write(File.read('build/flame.debug.js').gsub(%r{^(\s)+Ember\.assert\((.*)\).*$}, ''))
  flame_prod.close

  flame_min = File.open('build/flame.min.js', 'w')
  flame_min.write(Uglifier.compile(File.read('build/flame.prod.js')))
  flame_min.close

  # SCSS files
  css = environment.find_asset('flame.css.scss')
  css.write_to('build/stylesheets/flame.css')

  css_min = File.open('build/stylesheets/flame.min.css', 'w')
  css_min.write(CSSminify.compress(File.read('build/stylesheets/flame.css')))
  css_min.close

  # Copy over images directory
  FileUtils.copy_entry('images', 'build/images')
end

desc "Remove the build directory created by the 'build' task"
task :clean do
  FileUtils.rm_rf('build')
end

desc 'Run JSHint on Flame.js'
task :jshint do
  files = Rake::FileList.new('**/*.js').exclude('build/**/*.js')

  sh "jshint #{files.join(' ')}" do |ok, _|
    fail 'JSHint found errors.' unless ok
  end
end
